"""Lexical action and path normalization shared by graphs, rules and comparisons."""

import json
import posixpath
import re
import shlex
from dataclasses import dataclass

from schema.models import Action, Step

_TOOL_CATEGORIES = {
    "read": frozenset(
        "read read_file grep search glob find list_files web_search view view_image".split()
    ),
    "edit": frozenset(
        "apply_patch edit write write_file replace str_replace create_file delete_file".split()
    ),
    "validate": frozenset("run_tests test validate lint".split()),
    "plan": frozenset("update_plan plan list_tools".split()),
}
_SHELL_TOOLS = frozenset(
    "shell exec exec_command shell_command command command_execution run_command "
    "terminal bash sh zsh fish dash ksh powershell pwsh".split()
)
_SHELLS = frozenset("bash sh zsh fish dash ksh".split())
_VALIDATORS = frozenset(
    "pytest unittest ruff mypy vitest jest tox nox test lint check build".split()
)
_BUILD_TOOLS = frozenset("npm pnpm yarn cargo go make bun".split())
_BUILD_ACTIONS = frozenset("test check lint build".split())
_RUN_WRAPPERS = {
    ("uv", "run"), ("poetry", "run"), ("pipenv", "run"), ("npm", "exec"),
    ("pnpm", "exec"), ("pnpm", "dlx"), ("yarn", "exec"), ("bun", "x"),
}
_READ_COMMANDS = frozenset("cat head tail rg grep find stat nl less ls".split())
_EDIT_COMMANDS = frozenset("apply_patch patch touch mkdir mv cp rm tee install".split())
_CATEGORY_PRIORITY = {"shell": 0, "read": 1, "edit": 2, "validate": 3}
_PATH_ARGS = ("target", "targets", "path", "paths", "file", "files", "file_path", "filename")
_PATCH_PATH = re.compile(r"^\*\*\* (?:Add File|Delete File|Update File|Move to): (.+)$", re.M)
_LOCATION = re.compile(r":\d+(?::\d+)?$")
_DRIVE_ROOT = re.compile(r"^[a-zA-Z]:/")
_FILE_NAME = re.compile(r"(?:[\w@+\-][\w@.+\-]*\.[a-zA-Z][\w+\-]*|\.[a-zA-Z][\w.\-]*)$")
_COMMON_FILES = frozenset({"Makefile", "Dockerfile", "README", "LICENSE", "CHANGELOG"})
_OBSERVATION_TOKEN = re.compile(
    r"""(?<!\w)(?P<quote>["'\x60])(?P<quoted>[^\r\n]+?)(?P=quote)|[\w@.~+:/\\-]+"""
)
_ASSIGNMENT = re.compile(r"[a-zA-Z_][a-zA-Z_0-9]*=")
_SHELL_TOKEN = re.compile(
    r"""(?P<operator>\n|&&|\|\||[;|&]|\d*(?:<<<|<<-?|>>|>&|<&|[<>]))"""
    r"""|(?P<word>(?:'[^']*'|"(?:\\.|[^"\\])*"|\\[ \t\r\n'";|&<>]|[^\s'";|&<>])+)"""
)
_QUOTED_PART = re.compile(r"""'([^']*)'|"((?:\\.|[^"\\])*)"|\\([ \t\r\n'";|&<>])""")
_SEPARATOR = frozenset(("\n", ";", "&&", "||", "|", "&"))
_REDIRECT = frozenset(("<", ">", ">>", ">&", "<&", "<<", "<<-", "<<<"))


def normalize_path(path: str) -> str:
    """Normalize separators and dot segments without resolving against disk."""
    path = path.strip().replace("\\", "/")
    if not path:
        return ""
    if _DRIVE_ROOT.match(path):
        return path[:2] + posixpath.normpath("/" + path[3:].lstrip("/"))
    if path.startswith("//"):
        path = "/" + path.lstrip("/")
    return posixpath.normpath(path)


def _path_token(token: str, *, allow_bare: bool = False) -> str:
    token = _LOCATION.sub("", token.split("::", 1)[0])
    if not token or token.startswith(("-", "$")) or "://" in token or any(
        char in token for char in "\r\n"
    ):
        return ""
    if (
        "/" in token
        or "\\" in token
        or _FILE_NAME.fullmatch(token)
        or token in _COMMON_FILES
        or (allow_bare and not token.isdecimal())
    ):
        return normalize_path(token)
    return ""


def observation_paths(text: str) -> tuple[str, ...]:
    """Find path-like references, including traceback and pytest locations."""
    return tuple(dict.fromkeys(
        path
        for match in _OBSERVATION_TOKEN.finditer(text)
        if (path := _path_token((match["quoted"] or match[0]).rstrip(".,;:")))
    ))


def phase_id(step: Step) -> str:
    return step.phase or "other"


def step_error(step: Step) -> bool:
    observation = step.observation
    return observation is not None and (
        observation.error or observation.exit_code not in (None, 0)
    )


@dataclass(frozen=True)
class _Command:
    words: tuple[str, ...]
    inputs: tuple[str, ...]
    outputs: tuple[str, ...]

    @property
    def name(self) -> str:
        return posixpath.basename(self.words[0].replace("\\", "/")).lower()


def _unquote_part(match: re.Match[str]) -> str:
    if match[1] is not None:
        return match[1]
    if match[2] is not None:
        return re.sub(r'\\(["\\$`\n])', r"\1", match[2])
    return "" if match[3] == "\n" else match[3]


def _shell_segments(command: str):
    words, inputs, outputs = [], [], []
    redirection = None
    heredoc = False
    for token in _SHELL_TOKEN.finditer(command):
        operator = (token["operator"] or "").lstrip("0123456789")
        if operator in _SEPARATOR:
            if words or inputs or outputs:
                yield tuple(words), tuple(inputs), tuple(outputs)
            if operator == "\n" and heredoc:
                return
            words, inputs, outputs = [], [], []
            redirection = None
        elif operator in _REDIRECT:
            redirection = operator
            heredoc |= operator in ("<<", "<<-")
        else:
            word = _QUOTED_PART.sub(_unquote_part, token["word"])
            if redirection == "<" and not word.startswith("/dev/"):
                inputs.append(word)
            elif redirection in (">", ">>") and not word.startswith("/dev/"):
                outputs.append(word)
            elif redirection is None:
                words.append(word)
            redirection = None
    if words or inputs or outputs:
        yield tuple(words), tuple(inputs), tuple(outputs)


def _unwrap(words: tuple[str, ...]) -> tuple[tuple[str, ...], str | None]:
    while words:
        name = _Command(words, (), ()).name
        if name in _SHELLS:
            for position, option in enumerate(words[1:-1], start=1):
                if re.fullmatch(r"-[a-zA-Z]*c[a-zA-Z]*", option):
                    return (), words[position + 1]
                if not option.startswith("-"):
                    break
        if _ASSIGNMENT.match(words[0]):
            words = words[1:]
        elif name in ("env", "command", "exec", "sudo", "npx", "bunx", "timeout"):
            position = 1
            while position < len(words) and words[position].startswith("-"):
                option = words[position]
                if option in ("-u", "--unset", "-C", "--chdir", "-p", "--package",
                              "-s", "--signal", "-k", "--kill-after"):
                    position += 2
                else:
                    position += 1
            if name == "timeout":
                position += 1  # Duration precedes the command.
            words = words[position:]
        elif len(words) > 1 and (name, words[1]) in _RUN_WRAPPERS:
            words = words[2:]
        else:
            break
    return words, None


def _shell_commands(command: str) -> list[_Command]:
    commands = []
    pending = [iter(_shell_segments(command))]
    while pending:
        segment = next(pending[-1], None)
        if segment is None:
            pending.pop()
            continue
        words, inputs, outputs = segment
        words, nested = _unwrap(words)
        if nested is not None:
            pending.append(iter(_shell_segments(nested)))
        if words or inputs or outputs:
            commands.append(_Command(words or ("",), inputs, outputs))
    return commands


def _command_words(command: _Command) -> tuple[str, ...]:
    """Drop launcher paths and package-manager directory options."""
    arguments = command.words[1:]
    if command.name in _BUILD_TOOLS:
        while arguments and arguments[0] in ("--prefix", "--cwd", "--dir", "-C"):
            arguments = arguments[2:]
    return (command.name, *arguments)


def _command_category(command: _Command) -> str:
    name, *arguments = _command_words(command)
    python_module = (
        re.fullmatch(r"python(?:[23](?:\.\d+)?)?", name)
        and arguments[:1] == ["-m"]
        and len(arguments) >= 2
        and arguments[1] in _VALIDATORS
    )
    if (
        name in _VALIDATORS
        or python_module
        or (name in _BUILD_TOOLS and any(word in _BUILD_ACTIONS for word in arguments[:2]))
    ):
        return "validate"
    if name in _EDIT_COMMANDS or (name == "sed" and any(
        word.startswith(("-i", "--in-place")) for word in arguments
    )) or command.outputs:
        return "edit"
    if name in _READ_COMMANDS or name == "sed" or (
        name == "git" and arguments[:1] in (["diff"], ["show"], ["log"])
    ) or command.inputs:
        return "read"
    return "shell"


def _command_paths(command: _Command, category: str) -> tuple[list[str], list[str]]:
    if command.name == "cd":
        return [], []
    words = () if command.name in ("echo", "printf") else _command_words(command)[1:]
    bare_operands = command.name in _EDIT_COMMANDS or command.name in {
        "cat", "head", "tail", "stat", "nl", "less",
    }
    operands = [path for word in words if (path := _path_token(word, allow_bare=bare_operands))]
    inputs = [path for word in command.inputs if (path := _path_token(word, allow_bare=True))]
    outputs = [path for word in command.outputs if (path := _path_token(word, allow_bare=True))]
    writes = outputs.copy()
    if command.name == "cp":
        writes.extend(operands[-1:])
    elif command.name in _EDIT_COMMANDS or (command.name == "sed" and category == "edit"):
        writes.extend(operands)
    return [*operands, *inputs, *outputs], writes


def _action_command(action: Action) -> str:
    if action.command:
        return action.command
    for key in ("command", "cmd"):
        value = action.args.get(key)
        if isinstance(value, str) and value:
            return value
        if isinstance(value, list) and value and all(isinstance(word, str) for word in value):
            return shlex.join(value)
    return ""


def _action_targets(action: Action) -> tuple[str, ...]:
    targets = []
    for key in _PATH_ARGS:
        value = action.args.get(key)
        if isinstance(value, str):
            targets.append(value)
        elif isinstance(value, list):
            targets.extend(item for item in value if isinstance(item, str))
    return tuple(dict.fromkeys(path for target in targets if (path := normalize_path(target))))


@dataclass(frozen=True)
class NormalizedAction:
    tool: str | None
    category: str
    target: str
    targets: tuple[str, ...]
    writes: tuple[str, ...]
    commands: tuple[str, ...]

    @property
    def signature(self) -> str:
        tool = self.category if self.is_shell else self.tool
        return json.dumps([tool, self.target], ensure_ascii=False, separators=(",", ":"))

    @property
    def is_shell(self) -> bool:
        return self.tool is not None and self.tool.rsplit(".", 1)[-1] in _SHELL_TOOLS

    @property
    def label(self) -> str:
        if self.tool is None:
            return "Message"
        tool = self.category if self.is_shell else self.tool
        return f"{tool} · {self.target}" if self.target else tool or "Tool"


def normalize_action(action: Action | None) -> NormalizedAction:
    if action is None:
        return NormalizedAction(None, "message", "", (), (), ())
    tool = action.tool.strip().lower()
    name = tool.rsplit(".", 1)[-1]
    explicit = tuple(dict.fromkeys(
        path for target in action.targets if (path := normalize_path(target))
    ))
    command = _action_command(action)
    patch_texts = (command, *(action.args.get(key) for key in ("patch", "input", "diff")))
    patch_paths = [
        normalize_path(path)
        for value in patch_texts if isinstance(value, str)
        for path in _PATCH_PATH.findall(value)
    ]
    arg_targets = _action_targets(action)
    if name not in _SHELL_TOOLS:
        category = next((key for key, tools in _TOOL_CATEGORIES.items() if name in tools), "tool")
        targets = explicit or tuple(dict.fromkeys((*arg_targets, *patch_paths)))
        writes = targets if category == "edit" else ()
        return NormalizedAction(tool, category, next(iter(targets), ""), targets, writes, (command,))

    commands = _shell_commands(command)
    categories = [_command_category(segment) for segment in commands]
    effective = max(
        (i for i, segment in enumerate(commands) if segment.name != "cd"),
        key=lambda i: _CATEGORY_PRIORITY[categories[i]],
        default=None,
    )
    category = categories[effective] if effective is not None else "shell"
    command_paths = [
        _command_paths(segment, category) for segment, category in zip(commands, categories)
    ]
    inferred = tuple(dict.fromkeys(
        (*arg_targets, *patch_paths, *(path for paths, _ in command_paths for path in paths))
    ))
    targets = explicit or inferred
    primary_paths = command_paths[effective][0] if effective is not None else []
    commands_for_rules = tuple(
        " ".join((*_command_words(segment), *(f"> {path}" for path in segment.outputs)))
        for segment in commands
    )
    fallback = (
        shlex.join(_command_words(commands[effective])) if effective is not None
        else " ".join(command.split())
    )
    target = next(iter(explicit or arg_targets or patch_paths or primary_paths), fallback)
    writes = tuple(dict.fromkeys(
        (*patch_paths, *(path for _, paths in command_paths for path in paths))
    ))
    simple_edit = len(commands) == 1 and not commands[0].outputs and commands[0].name != "cp"
    if category == "edit" and explicit and (not writes or simple_edit):
        writes = explicit
    return NormalizedAction(tool, category, target, targets, writes, commands_for_rules)

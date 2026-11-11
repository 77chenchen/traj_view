import json

from backend.graph import build_graphs, compare
from schema.models import Action, Observation, RawRef, Step, Trajectory


def step(idx, tool=None, *, command=None, targets=(), observation=None, phase=None, args=None):
    return Step(
        idx=idx,
        action=Action(tool=tool, command=command, targets=targets, args=args or {}) if tool else None,
        observation=observation,
        raw_ref=RawRef(file="synthetic"),
        phase=phase,
    )


def trajectory(*steps):
    return Trajectory(id="run", source_format="canonical", task_id="task", steps=steps)


def edges(graph, edge_type):
    return {
        (edge["source"], edge["target"]): edge["count"]
        for edge in graph["edges"] if edge["type"] == edge_type
    }


def test_empty_graph():
    assert build_graphs(trajectory()) == {
        "id": "run",
        "expanded": {"nodes": [], "edges": []},
        "aggregated": {"nodes": [], "edges": []},
    }


def test_normalized_signatures_use_shell_category_and_first_target():
    graph = build_graphs(trajectory(
        step(2, "EXEC_COMMAND", args={
            "cmd": ["/bin/bash", "--norc", "-lc", "cd repo && env CI=1 uv run pytest "
                    "./tests/../tests/test_slug.py::test_slug 2>/dev/null"]
        }),
        step(5, "shell", command="pytest -q other.py", targets=[
            r".\tests\test_slug.py", "tests//test_slug.py", "src/slug.py",
        ]),
        step(9, "shell", command="cat 'src/file name.py'"),
        step(12, "shell", command=r"head -n 20 src\file\..\slug.py"),
        step(18, "shell", command="sed -n '1,120p' ./src/slug.py"),
        step(20, "READ_FILE", args={"file_path": "src/../tests/test_slug.py"}),
        step(25),
    ))
    nodes = graph["expanded"]["nodes"]
    assert [node["signature"] for node in nodes] == [
        '["validate:test","tests/test_slug.py"]',
        '["validate:test","tests/test_slug.py"]',
        '["read","src/file name.py"]',
        '["read","src/slug.py"]',
        '["read","src/slug.py"]',
        '["read_file","tests/test_slug.py"]',
        '[null,""]',
    ]
    assert nodes[0]["tool"] == "exec_command"
    assert nodes[0]["category"] == "validate"
    assert nodes[-1]["tool"] is None
    assert nodes[-1]["category"] == "message"
    assert [node["step_indices"] for node in graph["aggregated"]["nodes"]] == [
        [2, 5], [9], [12, 18], [20], [25],
    ]


def test_test_commands_ignore_launcher_and_flags_without_targets():
    graphs = build_graphs(trajectory(
        step(0, "shell", command="pytest -m smoke"),
        step(1, "shell", command="python3 -m unittest -v"),
        step(2, "shell", command="npm test"),
    ))
    node, = graphs["aggregated"]["nodes"]
    assert node["signature"] == '["validate:test",""]'
    assert node["count"] == 3


def test_forward_edges_follow_latest_writes_observations_and_failed_actions():
    trace = trajectory(
        step(2, "shell", command="pytest tests/test_slug.py", phase="validate",
             observation=Observation(text="File 'src/file name.py', line 3", exit_code=1)),
        step(4, "write_file", targets=["src/file name.py"], phase="edit"),
        step(7, "shell", command="pytest ./tests/test_slug.py", phase="validate",
             observation=Observation(text='File "src/file name.py"', error=True)),
        step(8, "shell", command="pytest tests/test_slug.py", phase="other",
             targets=["tests/test_slug.py", "src/file name.py"]),
        step(15, "shell", command="pytest tests/test_slug.py", phase="validate"),
        step(19),
    )
    graph = build_graphs(trace)
    expanded = graph["expanded"]
    assert edges(expanded, "temporal") == {
        (f"step-{left.idx}", f"step-{right.idx}"): 1
        for left, right in zip(trace.steps, trace.steps[1:])
    }
    assert edges(expanded, "retry") == {("step-2", "step-7"): 1, ("step-7", "step-8"): 1}
    assert edges(expanded, "dependency") == {
        ("step-2", "step-4"): 1,
        ("step-4", "step-7"): 1,
        ("step-4", "step-8"): 1,
        ("step-7", "step-8"): 1,
    }
    assert [node["error"] for node in expanded["nodes"]] == [True, False, True, False, False, False]
    assert all(
        int(edge["source"].removeprefix("step-")) < int(edge["target"].removeprefix("step-"))
        for edge in expanded["edges"]
    )

    aggregated = graph["aggregated"]
    validation = aggregated["nodes"][0]
    assert validation["phase"] == "validate"
    assert validation["phase_counts"] == {"validate": 3, "other": 1}
    assert validation["count"] == 4
    assert validation["first_idx"] == 2
    assert validation["step_indices"] == [2, 7, 8, 15]
    assert validation["error"] is True
    assert edges(aggregated, "retry") == {("aggregate-2", "aggregate-2"): 2}
    assert edges(aggregated, "temporal")[("aggregate-2", "aggregate-2")] == 2
    assert all(len({edge["id"] for edge in group["edges"]}) == len(group["edges"])
               for group in (expanded, aggregated))
    assert json.dumps(graph) == json.dumps(build_graphs(trace))


def test_dependencies_distinguish_written_paths_from_other_shell_operands():
    trace = trajectory(
        step(2, "shell", command="cp src/original.py src/copied.py && pytest tests/test_slug.py"),
        step(5, "shell", command="cat src/original.py"),
        step(7, "shell", command="pytest tests/test_slug.py",
             observation=Observation(text="Traceback: src/copied.py:21:3: failed")),
        step(9, "shell", command='printf "example > src/ignored.py" >src/actual.py'),
        step(10, "read_file", targets=["src/ignored.py"]),
        step(12, "read_file", targets=["src/actual.py", "src/copied.py"]),
        step(16, "write_file", targets=["src/copied.py"],
             observation=Observation(text="permission denied", exit_code=2)),
        step(18, "read_file", targets=["src/copied.py"]),
    )
    expanded = build_graphs(trace)["expanded"]
    assert expanded["nodes"][0]["signature"] == '["validate:test","tests/test_slug.py"]'
    assert expanded["nodes"][3]["signature"] == '["edit","src/actual.py"]'
    assert edges(expanded, "dependency") == {
        ("step-2", "step-7"): 1,
        ("step-2", "step-12"): 1,
        ("step-7", "step-12"): 1,
        ("step-9", "step-12"): 1,
        ("step-2", "step-16"): 1,
        ("step-7", "step-16"): 1,
        ("step-2", "step-18"): 1,
        ("step-7", "step-18"): 1,
    }


def test_patch_headers_supply_multiple_dependencies():
    patch = "*** Begin Patch\n*** Update File: src/a.py\n*** Add File: src/b.py\n*** End Patch"
    trace = trajectory(
        step(0, "apply_patch", args={"patch": patch}),
        step(9, "read_file", targets=["src/a.py", "src/b.py"]),
    )
    expanded = build_graphs(trace)["expanded"]
    assert expanded["nodes"][0]["signature"] == '["apply_patch","src/a.py"]'
    assert edges(expanded, "dependency") == {("step-0", "step-9"): 1}


def test_windows_drive_root_and_observation_paths_are_normalized_lexically():
    trace = trajectory(
        step(2, "write_file", targets=[r"C:\..\src\example.py"]),
        step(8, "shell", command=r"pytest tests\test_example.py",
             observation=Observation(text="File C:/src/example.py:12")),
    )
    expanded = build_graphs(trace)["expanded"]
    assert expanded["nodes"][0]["signature"] == '["write_file","C:/src/example.py"]'
    assert edges(expanded, "dependency") == {("step-2", "step-8"): 1}


def test_compare_ignores_messages_but_detects_repeats_and_source_indices():
    left = trajectory(
        step(2), step(4, "read", targets=["./src/a.py"]), step(7, "READ", targets=[r"src\a.py"]),
        step(12, "read", targets=["src/b.py"]),
    )
    right = trajectory(step(11, "read", targets=["src/a.py"]), step(15),
                       step(20, "read", targets=["src/b.py"]))
    assert compare(left, right) == {
        "jaccard": 1.0, "first_divergence": 1, "left_idx": 7, "right_idx": 20,
    }
    assert compare(left, left) == {
        "jaccard": 1.0, "first_divergence": None, "left_idx": None, "right_idx": None,
    }


def test_compare_different_targets_and_shorter_sequences():
    source = trajectory(step(5, "shell", command="cat src/a.py"))
    test = trajectory(step(9, "shell", command="cat tests/a.py"))
    assert compare(source, test) == {
        "jaccard": 0.0, "first_divergence": 0, "left_idx": 5, "right_idx": 9,
    }
    longer = trajectory(*source.steps, *test.steps)
    assert compare(source, longer) == {
        "jaccard": 0.5, "first_divergence": 1, "left_idx": None, "right_idx": 9,
    }
    assert compare(longer, source) == {
        "jaccard": 0.5, "first_divergence": 1, "left_idx": 9, "right_idx": None,
    }
    assert compare(trajectory(), trajectory(step(0))) == {
        "jaccard": 1.0, "first_divergence": None, "left_idx": None, "right_idx": None,
    }

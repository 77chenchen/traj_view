disposition: ship

## persistence

Second fix verdict only: this pass scores the previously listed TYPE correction and R1 source-reference wrapping. The ship disposition covers these scored fixes; it does not constitute a new whole-interface audit.

Opened all four replacement public message captures at 1586×912 and 1280×800, online and offline. All four are valid full-page captures of their named states. Reviewed the targeted CSS and updated verification.json, which reports recordingTypography and sourceReferenceWrap passing in both modes, with zero offline HTTP requests and page errors. No browser, test or detector was run in this pass. DESIGN.md and its token sidecar remain outside the fix scope.

## fidelity

| Scored item | Verdict | Evidence |
| --- | --- | --- |
| Original TYPE fix | resolved | The accepted 13px metadata/caveat and 15px JetBrains Mono evidence rules remain unchanged, with 1.5/1.65 leading. The four replacement captures retain those reading roles; supplied typography assertions remain passing online/offline. |
| Fix-batch regression R1: source-reference wrapping | resolved | All four replacement captures show the complete reference wrapping within the popover, including its final line reference. The targeted paragraph rule now permits wrapping anywhere; supplied browser assertions confirm its scroll width stays within its client width tolerance at both desktop sizes online/offline. |

## ceiling

The scored fixes reach the agreed reading and containment requirements. No regression from the R1 correction is visible in the reviewed states. Whole-surface ceiling, source-data behavior and unrelated limitations were not reassessed.

## material_fixes

Clear for the scored TYPE and R1 fixes. No further correction is owed by this verdict pass.

## keep

Keep the resolved reading roles and reference wrapping, current popover geometry, on-demand disclosure and all source-truth behavior intact.

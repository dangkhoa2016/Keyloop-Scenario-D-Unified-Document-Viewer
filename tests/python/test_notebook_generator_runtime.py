import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
GENERATOR = ROOT / 'scripts' / 'build-reviewer-notebook.py'
NOTEBOOK = ROOT / 'notebooks' / 'Keyloop-Scenario-D-Kaggle-Demo.ipynb'

def as_text(value):
    return ''.join(value) if isinstance(value, list) else value

class NotebookGeneratorRuntimeTests(unittest.TestCase):
    def test_generator_uses_explicit_runtime_markers_not_first_output_line(self):
        source = GENERATOR.read_text()
        self.assertIn('__KEYLOOP_NODE_VERSION__=', source)
        self.assertIn('__KEYLOOP_NPM_VERSION__=', source)
        self.assertIn('NODE_RUNTIME=', source)
        self.assertIn('NPM_RUNTIME=', source)
        self.assertIn('NODE_SOURCE=', source)
        self.assertNotIn("NODE.splitlines()[0]", source)

    def test_generated_notebook_uses_same_runtime_marker_contract(self):
        data = json.loads(NOTEBOOK.read_text())
        runtime_cell = None
        for cell in data['cells']:
            source = as_text(cell.get('source', ''))
            if cell.get('cell_type') == 'code' and source.startswith('# 04 — Node + npm dependencies'):
                runtime_cell = source
                break
        self.assertIsNotNone(runtime_cell, 'Node runtime cell not found')
        self.assertIn('__KEYLOOP_NODE_VERSION__=', runtime_cell)
        self.assertIn('__KEYLOOP_NPM_VERSION__=', runtime_cell)
        self.assertIn('NODE_RUNTIME=', runtime_cell)
        self.assertIn('NPM_RUNTIME=', runtime_cell)
        self.assertIn('NODE_SOURCE=', runtime_cell)
        self.assertNotIn("NODE.splitlines()[0]", runtime_cell)

    def test_production_notebook_runs_only_evidence_suite(self):
        source = GENERATOR.read_text()
        self.assertIn("tests/python/test_reviewer_evidence.py", source)
        self.assertNotIn("'unittest','discover','-s','tests/python'", source)

    def test_generated_runtime_cell_is_valid_python(self):
        data = json.loads(NOTEBOOK.read_text())
        for cell in data['cells']:
            source = as_text(cell.get('source', ''))
            if cell.get('cell_type') == 'code' and source.startswith('# 04 — Node + npm dependencies'):
                compile(source, '<notebook-step-04>', 'exec')
                return
        self.fail('Node runtime cell not found')

    def test_node_cache_requires_complete_distribution_and_self_repairs(self):
        source = GENERATOR.read_text()
        start = source.index('# 04 — Node + npm dependencies')
        end = source.index('# 05 — Build and static analysis', start)
        runtime_source = source[start:end]
        self.assertIn("bin'/'npm", runtime_source)
        self.assertIn("lib'/'node_modules'/'npm'/'package.json", runtime_source)
        self.assertIn('NODE_CACHE_STATUS=', runtime_source)
        self.assertIn('shutil.rmtree', runtime_source)
        self.assertIn('staging', runtime_source)
        self.assertNotIn("if not binary.is_file():", runtime_source)

    def test_runtime_failure_diagnostics_include_cache_and_probe_state(self):
        source = GENERATOR.read_text()
        self.assertIn('NODE_PROBE_RC=', source)
        self.assertIn('NODE_EXECUTABLE=', source)
        self.assertIn('NPM_EXECUTABLE=', source)

    def test_cloudflared_cache_requires_executable_probe_and_self_repairs(self):
        source = GENERATOR.read_text()
        start = source.index("# 17 — Optional public Cloudflare Quick Tunnel")
        end = source.index("# 18 — Reviewer summary", start)
        tunnel = source[start:end]
        self.assertIn('CLOUDFLARED_CACHE_STATUS=', tunnel)
        self.assertIn('CLOUDFLARED_PROBE_RC=', tunnel)
        self.assertIn('CLOUDFLARED_VERSION=', tunnel)
        self.assertIn('os.access(binary,os.X_OK)', tunnel)
        self.assertIn("'--version'", tunnel)
        self.assertIn('REPAIRED_NON_EXECUTABLE', tunnel)
        self.assertIn('REPAIRED_FAILED_PROBE', tunnel)
        self.assertIn('.staging-', tunnel)
        self.assertNotIn("if not binary.is_file():", tunnel)

    def test_generated_cloudflared_cell_is_valid_python_and_hardened(self):
        data = json.loads(NOTEBOOK.read_text())
        for cell in data['cells']:
            source = as_text(cell.get('source', ''))
            if cell.get('cell_type') == 'code' and source.startswith('# 17 — Optional public Cloudflare Quick Tunnel'):
                compile(source, '<notebook-step-17>', 'exec')
                self.assertIn('CLOUDFLARED_CACHE_STATUS=', source)
                self.assertIn('CLOUDFLARED_PROBE_RC=', source)
                self.assertIn('REPAIRED_NON_EXECUTABLE', source)
                return
        self.fail('Cloudflare tunnel cell not found')

if __name__ == '__main__':
    unittest.main()

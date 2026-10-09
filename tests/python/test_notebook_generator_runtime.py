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

if __name__ == '__main__':
    unittest.main()

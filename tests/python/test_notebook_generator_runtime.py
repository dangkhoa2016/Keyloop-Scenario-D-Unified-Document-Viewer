import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
GENERATOR = ROOT / 'scripts' / 'build-reviewer-notebook.py'

class NotebookGeneratorRuntimeTests(unittest.TestCase):
    def test_generator_uses_explicit_runtime_markers_not_first_output_line(self):
        source = GENERATOR.read_text()
        self.assertIn('__KEYLOOP_NODE_VERSION__=', source)
        self.assertIn('__KEYLOOP_NPM_VERSION__=', source)
        self.assertIn('NODE_RUNTIME=', source)
        self.assertIn('NPM_RUNTIME=', source)
        self.assertIn('NODE_SOURCE=', source)
        self.assertNotIn("NODE.splitlines()[0]", source)

if __name__ == '__main__':
    unittest.main()

#!/bin/bash
set -e
cd "$(dirname "$0")"
STATSEED_PATH=${STATSEED_PATH:-$(cd .. && pwd)}
PYTHON=$STATSEED_PATH/.venv/bin/python

$PYTHON data_gen.py
$PYTHON statseed_calc.py > /dev/null
$PYTHON compare.py statseed_results.json r_results.json

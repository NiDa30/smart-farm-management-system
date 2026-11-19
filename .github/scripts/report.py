"""Publish CI results as check-run annotations (readable without log access).

Usage:
  report.py surefire <reports-dir> <maven-log>
  report.py log <name> <summary-file> <log-file>
"""
import glob
import os
import sys
import xml.etree.ElementTree as ET


def esc(text: str) -> str:
    return text.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')


LIMIT = 3800  # GitHub keeps roughly the first 4 KB of an annotation message


def emit(kind: str, title: str, body: str, keep_end: bool = False) -> None:
    body = body[-LIMIT:] if keep_end else body[:LIMIT]
    print(f'::{kind} title={esc(title)}::{esc(body)}')


def read(path: str) -> str:
    try:
        with open(path, encoding='utf-8', errors='replace') as handle:
            return handle.read()
    except OSError:
        return ''


def surefire(directory: str, log_path: str) -> None:
    rows, failures, causes = [], [], {}
    total = {'tests': 0, 'failures': 0, 'errors': 0, 'skipped': 0}
    for path in sorted(glob.glob(os.path.join(directory, 'TEST-*.xml'))):
        suite = ET.parse(path).getroot()
        counts = {key: int(suite.get(key, 0)) for key in total}
        for key in total:
            total[key] += counts[key]
        rows.append(f"{suite.get('name')}: {counts['tests']} tests, "
                    f"{counts['failures'] + counts['errors']} failed, {counts['skipped']} skipped")
        for case in suite.iter('testcase'):
            for problem in list(case.findall('failure')) + list(case.findall('error')):
                text = problem.text or ''
                for line in text.splitlines():
                    if line.startswith('Caused by:'):
                        causes[line[:1500]] = causes.get(line[:1500], 0) + 1
                if 'failure threshold' in (problem.get('message') or ''):
                    continue
                detail = (problem.get('message') or '') + '\n' + text[:6000]
                failures.append((f"{case.get('classname')}.{case.get('name')}", detail))
    summary = (f"TOTAL {total['tests']} tests, {total['failures']} failures, "
               f"{total['errors']} errors, {total['skipped']} skipped\n" + '\n'.join(rows))
    emit('notice', 'surefire summary', summary)
    if causes:
        ranked = sorted(causes.items(), key=lambda item: -item[1])
        emit('error', 'root causes', '\n\n'.join(f'[{n}x] {c}' for c, n in ranked[:25]))
    for name, detail in failures[:30]:
        emit('error', name, detail)
    log = read(log_path).splitlines()
    error_lines = [line for line in log if line.startswith('[ERROR]')]
    if error_lines and not failures:
        emit('error', 'maven errors', '\n'.join(error_lines[:300]))


def plain(name: str, summary_path: str, log_path: str) -> None:
    emit('notice', f'{name} summary', read(summary_path) or '(empty)', keep_end=True)
    lines = read(log_path).splitlines()
    problems = [line for line in lines if any(k in line for k in ('error', 'Error', 'FAIL', 'Assertion', 'assert'))]
    for start in range(0, min(len(problems), 120), 30):
        emit('warning', f'{name} error lines {start + 1}+', '\n'.join(problems[start:start + 30]))
    if lines:
        emit('warning', f'{name} log tail', '\n'.join(lines[-200:]), keep_end=True)


if __name__ == '__main__':
    if sys.argv[1] == 'surefire':
        surefire(sys.argv[2], sys.argv[3])
    else:
        plain(sys.argv[2], sys.argv[3], sys.argv[4])

#!/usr/bin/env python3
"""
json_diff.py

Production-grade semantic JSON diff tool with deep comparison
and robust colorized output.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any, List, Literal, Optional
from collections import Counter

# --- Color handling ---------------------------------------------------------

USE_RICH = False
console = None

try:
    from rich.console import Console
    from rich.text import Text

    USE_RICH = True
except ImportError:
    USE_RICH = False


def ansi(color: str, text: str) -> str:
    codes = {
        "red": "\033[31m",
        "green": "\033[32m",
        "yellow": "\033[33m",
        "bold": "\033[1m",
        "reset": "\033[0m",
    }
    return f"{codes[color]}{text}{codes['reset']}"


# --- Diff model -------------------------------------------------------------

DiffType = Literal[
    "added",
    "removed",
    "changed",
    "type_mismatch",
    "list_item_added",
    "list_item_removed",
]


@dataclass(frozen=True)
class Difference:
    path: str
    diff_type: DiffType
    left: Any
    right: Any
    detail: Optional[str] = None


# --- Core diff engine -------------------------------------------------------

class JsonDiffer:
    def __init__(self, unordered_lists: bool = False):
        self.unordered_lists = unordered_lists
        self.diffs: List[Difference] = []

    def compare(self, left: Any, right: Any, path: str = "$"):
        if type(left) is not type(right):
            self.diffs.append(
                Difference(path, "type_mismatch", left, right)
            )
            return

        if isinstance(left, dict):
            self._compare_dict(left, right, path)
        elif isinstance(left, list):
            self._compare_list(left, right, path)
        else:
            if left != right:
                self.diffs.append(
                    Difference(path, "changed", left, right)
                )

    def _compare_dict(self, left: dict, right: dict, path: str):
        left_keys = set(left)
        right_keys = set(right)

        for key in sorted(left_keys - right_keys):
            self.diffs.append(
                Difference(f"{path}.{key}", "removed", left[key], None)
            )

        for key in sorted(right_keys - left_keys):
            self.diffs.append(
                Difference(f"{path}.{key}", "added", None, right[key])
            )

        for key in sorted(left_keys & right_keys):
            self.compare(left[key], right[key], f"{path}.{key}")

    def _compare_list(self, left: list, right: list, path: str):
        if self.unordered_lists:
            self._compare_unordered_list(left, right, path)
            return

        min_len = min(len(left), len(right))

        for i in range(min_len):
            self.compare(left[i], right[i], f"{path}[{i}]")

        for i in range(min_len, len(left)):
            self.diffs.append(
                Difference(f"{path}[{i}]", "list_item_removed", left[i], None)
            )

        for i in range(min_len, len(right)):
            self.diffs.append(
                Difference(f"{path}[{i}]", "list_item_added", None, right[i])
            )

    def _compare_unordered_list(self, left: list, right: list, path: str):
        left_count = Counter(map(repr, left))
        right_count = Counter(map(repr, right))

        for item, count in (left_count - right_count).items():
            self.diffs.append(
                Difference(
                    path,
                    "list_item_removed",
                    item,
                    None,
                    detail=f"missing {count} occurrence(s)",
                )
            )

        for item, count in (right_count - left_count).items():
            self.diffs.append(
                Difference(
                    path,
                    "list_item_added",
                    None,
                    item,
                    detail=f"extra {count} occurrence(s)",
                )
            )


# --- Output ----------------------------------------------------------------

def format_diff_plain(d: Difference) -> str:
    msg = f"{d.diff_type.upper()} at {d.path}\n"
    msg += f"  left : {d.left}\n"
    msg += f"  right: {d.right}"
    if d.detail:
        msg += f"\n  detail: {d.detail}"
    return msg


def format_diff_color(d: Difference) -> str:
    return (
        f"{ansi('yellow', d.diff_type.upper())} at {d.path}\n"
        f"  {ansi('bold', 'left :')} {ansi('red', str(d.left))}\n"
        f"  {ansi('bold', 'right:')} {ansi('green', str(d.right))}"
        + (f"\n  detail: {d.detail}" if d.detail else "")
    )


def print_diffs(diffs: List[Difference], color: bool):
    for d in diffs:
        if USE_RICH and color:
            console.print(format_diff_rich(d))
        elif color:
            print(format_diff_color(d))
        else:
            print(format_diff_plain(d))
        print()


def format_diff_rich(d: Difference):
    text = Text()
    text.append(d.diff_type.upper(), style="bold yellow")
    text.append(f" at {d.path}\n")
    text.append("  left : ", style="bold")
    text.append(str(d.left), style="red")
    text.append("\n  right: ", style="bold")
    text.append(str(d.right), style="green")
    if d.detail:
        text.append(f"\n  detail: {d.detail}", style="italic")
    return text


# --- CLI -------------------------------------------------------------------

def load_json(path: str) -> Any:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        sys.exit(f"ERROR: Failed to load '{path}': {exc}")


def main():
    parser = argparse.ArgumentParser(description="Deep semantic JSON diff tool")
    parser.add_argument("left")
    parser.add_argument("right")
    parser.add_argument("--unordered-lists", action="store_true")
    parser.add_argument("--format", choices=("human", "json"), default="human")
    parser.add_argument("--color", action="store_true", default=True)
    parser.add_argument("--no-color", dest="color", action="store_false")

    args = parser.parse_args()

    global console
    if USE_RICH and args.color:
        console = Console(force_terminal=True)

    left = load_json(args.left)
    right = load_json(args.right)

    differ = JsonDiffer(unordered_lists=args.unordered_lists)
    differ.compare(left, right)

    if not differ.diffs:
        print("No differences found.")
        sys.exit(0)

    if args.format == "json":
        print(json.dumps([d.__dict__ for d in differ.diffs], indent=2))
    else:
        print_diffs(differ.diffs, args.color)

    sys.exit(1)


if __name__ == "__main__":
    main()
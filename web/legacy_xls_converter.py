"""把原时间日志 XLS 转成可预览的时间账 JSON；不修改源文件。"""

import argparse
import collections
import datetime as dt
import hashlib
import json
from pathlib import Path

import xlrd


HEADERS = {
    "事件": ("起始时间", "结束时间", "分类", "备注", "总时长", "预估时长", "标签"),
    "日志": ("日期", "日志类型", "内容"),
}
CATEGORY_IDS = {
    "日常": "daily", "吃饭": "daily_eat", "家务": "daily_house", "洗漱": "daily_wash",
    "路上": "daily_travel", "睡觉": "daily_sleep", "提升": "growth", "运动": "growth_sport",
    "大模型应用": "growth_ai", "项目复盘": "growth_review", "简历撰写": "growth_resume",
    "多领国": "growth_duolingo", "多邻国": "growth_duolingo", "阅读": "growth_read", "输出": "growth_output",
    "工作": "work", "会议": "meeting", "娱乐": "fun", "摸鱼": "fun_slack",
    "打游戏": "fun_game", "短视频/追剧/看小说": "fun_video", "极": "fun_extreme",
    "其他": "other", "社交/旅游": "other_social",
}
TZ = dt.timezone(dt.timedelta(hours=8))


def rows(sheet, headers):
    actual = tuple(sheet.row_values(0))
    if actual != headers:
        raise ValueError(f"{sheet.name} 列名不匹配：{actual!r}")
    for i in range(1, sheet.nrows):
        yield i + 1, tuple(sheet.row_values(i))


def timestamp_ms(value):
    parsed = dt.datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=TZ)
    return int(parsed.timestamp() * 1000)


def convert(path):
    raw = path.read_bytes()
    workbook = xlrd.open_workbook(file_contents=raw)
    events, logs, unknown = [], [], {}
    occurrences = collections.Counter()
    for row_number, row in rows(workbook.sheet_by_name("事件"), HEADERS["事件"]):
        start, end = timestamp_ms(row[0]), timestamp_ms(row[1])
        if end < start:
            raise ValueError(f"事件第 {row_number} 行的终点早于起点")
        key = json.dumps(row, ensure_ascii=False, separators=(",", ":"))
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:20]
        occurrences[digest] += 1
        category_name = row[2]
        category_id = CATEGORY_IDS.get(category_name)
        if category_id is None:
            category_id = "legacy_" + hashlib.sha256(category_name.encode()).hexdigest()[:12]
            unknown[category_id] = category_name
        events.append({
            "id": f"xls_{digest}_{occurrences[digest]}", "categoryId": category_id,
            "start": start, "end": end, "note": row[3],
            "legacyDuration": row[4], "legacyEstimate": row[5], "legacyTags": row[6],
            "sourceRow": row_number, "sourceCategoryName": category_name,
        })
    for row_number, row in rows(workbook.sheet_by_name("日志"), HEADERS["日志"]):
        logs.append({"date": row[0], "type": row[1], "content": row[2], "sourceRow": row_number})
    return {
        "format": "time-ledger-import-v1",
        "source": {"type": "xls", "fileName": path.name, "sha256": hashlib.sha256(raw).hexdigest(), "timeZone": "Asia/Shanghai"},
        "events": events, "logs": logs,
        "extraCategories": [{"id": identifier, "name": name, "color": "#808a86", "parentId": None, "archived": False} for identifier, name in unknown.items()],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="原时间日志 XLS 文件")
    parser.add_argument("--output", type=Path, help="输出私人 JSON 文件；省略时只验证并报告条数")
    args = parser.parse_args()
    payload = convert(args.source)
    report = {
        "source_file": args.source.name,
        "events": len(payload["events"]), "logs": len(payload["logs"]),
        "unknown_categories": [c["name"] for c in payload["extraCategories"]],
        "zero_duration_events": sum(e["start"] == e["end"] for e in payload["events"]),
        "work_name_mapping": "XLS 只有名称，‘工作’暂映射到截图中的‘工作 / 工作’子分类",
    }
    if args.output:
        if args.output.exists():
            raise FileExistsError(f"目标已存在，不覆盖：{args.output}")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        report["output"] = str(args.output)
    print(json.dumps(report, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()

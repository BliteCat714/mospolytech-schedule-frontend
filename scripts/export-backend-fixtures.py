"""Run with the backend venv Python; reads its local SQLite database without writes."""

import argparse
import json
import os
from pathlib import Path
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("backend", type=Path)
args = parser.parse_args()
backend = args.backend.resolve()
sys.path.insert(0, str(backend))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DB_ENGINE"] = "sqlite"

import django
django.setup()

from django.conf import settings
from django.db import connection
from rest_framework.test import APIClient
from schedule_generator.models import Student, Teacher

# Enforce read-only access, including queries made by API views.
settings.ALLOWED_HOSTS = [*settings.ALLOWED_HOSTS, "localhost"]
with connection.cursor() as cursor:
    cursor.execute("PRAGMA query_only = ON")
client = APIClient(HTTP_HOST="localhost")


def get(path, **query):
    response = client.get(f"/api/schedule/{path}", query)
    if response.status_code != 200:
        raise RuntimeError(f"{path}: {response.status_code} {response.data}")
    return json.loads(json.dumps(response.data, default=str))


semesters = get("semesters/", page_size=1000)["results"]
semester = semesters[-1]["id"]
students = []
student_schedules = {}
for group in Student.objects.values_list("group_id", flat=True).distinct():
    for student in Student.objects.filter(group_id=group).order_by("pk")[:2]:
        schedule = get(f"schedule/students/{student.pk}/", semester=semester)
        if not schedule["scheduled_classes"]:
            continue
        students.append(get(f"students/{student.pk}/"))
        student_schedules[str(student.pk)] = schedule
    if len(students) >= 6:
        break

teachers = []
teacher_schedules = {}
for teacher in Teacher.objects.filter(imported_lessons__isnull=False).distinct().order_by("pk"):
    schedule = get(f"imported/teachers/{teacher.pk}/schedule/", page_size=1000)
    if not any(not rule["week_raw"].strip() and rule["date_from"] and rule["date_to"]
               and rule["start"] and rule["end"] for rule in schedule["results"]):
        continue
    teachers.append(schedule["teacher"])
    teacher_schedules[str(teacher.pk)] = schedule
    if len(teachers) == 3:
        break

rooms = get("rooms/", page_size=1000)["results"]
room_slots = {}
for day in range(6):
    for lesson in range(1, 8):
        response = get("schedule/free-rooms/", semester=semester,
                       day_of_week=day, lesson_number=lesson)
        room_slots[f"{day}-{lesson}"] = {
            "slot": response["slot"],
            "room_ids": [room["id"] for room in response["rooms"]],
        }

from schedule_generator.management.commands.seed_pe import DIRECTIONS, TIMES
directions = [{"id": i, "code": code, "name": name, "icon": icon}
              for i, (code, name, icon, _) in enumerate(DIRECTIONS, 1)]
slots = []
for direction, (_, _, _, place) in zip(directions, DIRECTIONS):
    for day in range(6):
        for start, end in TIMES:
            slots.append({"id": len(slots) + 1, "direction": direction["id"],
                          "day_of_week": day, "start_time": str(start),
                          "end_time": str(end), "place": place})

data = {"semesters": semesters, "students": students,
        "studentSchedules": student_schedules, "teachers": teachers,
        "teacherSchedules": teacher_schedules, "rooms": rooms, "roomSlots": room_slots,
        "directions": directions, "peSlots": slots}
target = Path(__file__).resolve().parents[1] / "src/mocks/backend.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Exported {len(students)} demo students, {len(teachers)} teachers to {target}")

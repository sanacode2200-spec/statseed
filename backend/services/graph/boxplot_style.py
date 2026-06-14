from typing import Literal

from backend.schemas.graph import BoxplotRequest

BoxplotDisplayStyle = Literal["simple", "distribution", "individual"]


def effective_display_style(request: BoxplotRequest) -> BoxplotDisplayStyle:
    if request.display_style != "auto":
        return request.display_style
    if not request.show_jitter:
        return "simple"
    return "individual"


def display_names(request: BoxplotRequest) -> list[str]:
    names = request.group_names or [f"群{i + 1}" for i in range(len(request.groups))]
    if not request.show_n:
        return names
    return [f"{name}\n(n = {len(group)})" for name, group in zip(names, request.groups)]

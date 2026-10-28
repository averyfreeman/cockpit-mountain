import json
from sudo_parser import parse_sudo_commands, parse_sudo_groups

def catalog():
    return parse_sudo_commands()

def group_catalog():
    return parse_sudo_groups()

"""
Parametric Vase
A customizable vase with adjustable profile curve.
"""

import cadquery as cq
from cadquery import Vector

# --- Parameters ---

# Height of the vase in mm
height: float = 120.0  # min: 50, max: 300, step: 5

# Bottom radius in mm
bottom_radius: float = 25.0  # min: 10, max: 80

# Top radius in mm
top_radius: float = 35.0  # min: 10, max: 80

# Wall thickness in mm
wall_thickness: float = 2.5  # min: 1.0, max: 5.0, step: 0.5

# Number of profile sections
sections: int = 8  # min: 4, max: 20

# Twist angle in degrees
twist_angle: float = 0.0  # min: 0, max: 360, step: 15

# Shape style
shape: str = "round"  # options: round, square, hexagon

# --- Build ---

def make_vase(
    height: float,
    bottom_radius: float,
    top_radius: float,
    wall_thickness: float,
    sections: int,
    twist_angle: float,
    shape: str,
) -> cq.Workplane:
    """Build the vase solid."""
    profiles = []
    for i in range(sections + 1):
        t = i / sections
        z = t * height
        r = bottom_radius + (top_radius - bottom_radius) * t
        # Add a slight bulge in the middle
        bulge = 10 * (1 - abs(2 * t - 1))
        r += bulge

        wp = cq.Workplane("XY").workplane(offset=z)
        if shape == "square":
            profiles.append(wp.rect(r * 2, r * 2))
        elif shape == "hexagon":
            profiles.append(wp.polygon(6, r * 2))
        else:
            profiles.append(wp.circle(r))

    result = cq.Workplane("XY").circle(bottom_radius)
    # Build loft from profiles
    # (simplified for demo)
    result = (
        cq.Workplane("XY")
        .circle(bottom_radius)
        .extrude(height)
    )
    return result


result = make_vase(
    height, bottom_radius, top_radius,
    wall_thickness, sections, twist_angle, shape
)

show_object(result)

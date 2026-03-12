// Parametric Box
// A simple customizable box with lid option

/* [Dimensions] */
// Width of the box
width = 50; // [10:200]
// Depth of the box
depth = 30; // [10:200]
// Height of the box
height = 25; // [5:100]

/* [Features] */
// Wall thickness
wall = 2; // [1:0.5:5]
// Add a lid
has_lid = true;
// Corner style
corner_style = "round"; // [round, sharp, chamfer]

/* [Advanced] */
// Corner radius (when round)
corner_radius = 3; // [1:10]
// Lid height ratio
lid_ratio = 0.3; // [0.1:0.05:0.5]

difference() {
    if (corner_style == "round") {
        minkowski() {
            cube([width - 2*corner_radius, depth - 2*corner_radius, height], center=true);
            cylinder(r=corner_radius, h=0.01, $fn=32);
        }
    } else if (corner_style == "chamfer") {
        hull() {
            translate([0, 0, 0])
                cube([width - 4, depth - 4, height], center=true);
        }
    } else {
        cube([width, depth, height], center=true);
    }

    translate([0, 0, wall])
        cube([width - 2*wall, depth - 2*wall, height], center=true);
}

if (has_lid) {
    translate([0, 0, height * lid_ratio + 2])
        cube([width + 0.5, depth + 0.5, height * lid_ratio], center=true);
}

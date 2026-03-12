// Parametric Gear
// A simple spur gear generator

/* [Gear Parameters] */
// Number of teeth
teeth = 20; // [6:1:100]
// Module (tooth size)
module_size = 2; // [0.5:0.5:10]
// Pressure angle in degrees
pressure_angle = 20; // [14.5, 20, 25]
// Gear thickness
thickness = 5; // [1:50]

/* [Bore] */
// Center bore diameter
bore_diameter = 8; // [0:0.5:50]
// Number of spokes (0 for solid)
spokes = 0; // [0:1:8]

/* [Quality] */
// Rendering resolution
quality = "medium"; // [low, medium, high]

fn = quality == "high" ? 128 : quality == "medium" ? 64 : 32;

pitch_radius = teeth * module_size / 2;
outer_radius = pitch_radius + module_size;

difference() {
    // Gear body
    cylinder(r=outer_radius, h=thickness, $fn=fn, center=true);

    // Bore
    if (bore_diameter > 0) {
        cylinder(d=bore_diameter, h=thickness + 1, $fn=fn, center=true);
    }
}

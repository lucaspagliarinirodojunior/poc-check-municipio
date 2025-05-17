const fs = require('fs');
const readline = require('readline');
const shapefile = require('shapefile');
const turf = require('@turf/turf');

class MunicipalityFinder {
    constructor() {
        this.municipalities = [];
        this.loaded = false;
    }

    async loadShapefile(filePath) {
        try {
            console.log('Loading shapefile...');

            const source = await shapefile.open(filePath);

            let result;
            while ((result = await source.read()) && !result.done) {
                this.municipalities.push(result.value);
            }

            this.loaded = true;
            console.log(`Loaded ${this.municipalities.length} municipalities`);
        } catch (error) {
            console.error('Error loading shapefile:', error);
        }
    }

    findMunicipalityName(lat, lng) {
        if (!this.loaded) {
            console.error('Shapefile not loaded');
            return null;
        }

        const point = turf.point([lng, lat]);

        for (const municipality of this.municipalities) {
            try {
                if (turf.booleanPointInPolygon(point, municipality)) {
                    return municipality.properties.NM_MUN ||
                        municipality.properties.NOME ||
                        municipality.properties.name;
                }
            } catch (error) {
                continue;
            }
        }

        return null;
    }
}

// Create interactive CLI
async function main() {
    const finder = new MunicipalityFinder();

    // Path to your shapefile
    const shapefilePath = 'data/BR_Municipios_2024.shp';

    // Setup readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Load shapefile
    console.log("Loading municipalities shapefile. Please wait...");
    await finder.loadShapefile(shapefilePath);

    console.log("\n=== Municipality Finder ===");
    console.log("Type coordinates as 'lat,lng' (e.g. -16.6799,-49.2550)");
    console.log("Type 'exit' to quit\n");

    // Start interactive prompt
    const promptUser = () => {
        rl.question('Enter coordinates > ', (input) => {
            if (input.toLowerCase() === 'exit') {
                console.log('Goodbye!');
                rl.close();
                return;
            }

            try {
                const [lat, lng] = input.split(',').map(coord => parseFloat(coord.trim()));

                if (isNaN(lat) || isNaN(lng)) {
                    console.log('Invalid coordinates. Please use format: lat,lng');
                } else {
                    const municipality = finder.findMunicipalityName(lat, lng);
                    console.log(`Result: ${municipality || 'No municipality found'}`);
                }
            } catch (error) {
                console.log('Error processing input. Please use format: lat,lng');
            }

            promptUser();
        });
    };

    promptUser();
}

main().catch(console.error);
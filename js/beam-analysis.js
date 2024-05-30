'use strict';

/** ============================ Beam Analysis Data Type ============================ */

/**
 * Beam material specification.
 *
 * @param {String} name         Material name
 * @param {Object} properties   Material properties {EI : 0, GA : 0, ....}
 */
function Material(name, properties) {
    this.name = name;
    this.properties = properties;
}

/**
 *
 * @param {Number} primarySpan          Beam primary span length
 * @param {Number} secondarySpan        Beam secondary span length
 * @param {Material} material           Beam material object
 */
function Beam(primarySpan, secondarySpan, material) {
    this.primarySpan = primarySpan;
    this.secondarySpan = secondarySpan;
    this.material = material;
}

/** ============================ Beam Analysis Class ============================ */

function BeamAnalysis() {
    this.options = {
        condition: 'simply-supported'
    };

    this.analyzer = {
        'simply-supported': new BeamAnalysis.analyzer.simplySupported(),
        'two-span-unequal': new BeamAnalysis.analyzer.twoSpanUnequal()
    };
}

BeamAnalysis.prototype = {
    /**
     *
     * @param {Beam} beam
     * @param {Number} load
     */
    getDeflection: function (beam, load, condition) {
        var analyzer = this.analyzer[condition];

        if (analyzer) {
            return {
                beam: beam,
                load: load,
                equation: analyzer.getDeflectionEquation(beam, load)
            };
        } else {
            throw new Error('Invalid condition');
        }
    },

    getBendingMoment: function (beam, load, condition) {
        var analyzer = this.analyzer[condition];

        if (analyzer) {
            return {
                beam: beam,
                load: load,
                equation: analyzer.getBendingMomentEquation(beam, load)
            };
        } else {
            throw new Error('Invalid condition');
        }
    },

    getShearForce: function (beam, load, condition) {
        var analyzer = this.analyzer[condition];

        if (analyzer) {
            return {
                beam: beam,
                load: load,
                equation: analyzer.getShearForceEquation(beam, load)
            };
        } else {
            throw new Error('Invalid condition');
        }
    }
};



/** ============================ Beam Analysis Analyzer ============================ */

/**
 * Available analyzers for different conditions
 */
BeamAnalysis.analyzer = {};

/**
 * Calculate deflection, bending stress and shear stress for a simply supported beam
 *
 * @param {Beam}   beam   The beam object
 * @param {Number}  load    The applied load
 */
BeamAnalysis.analyzer.simplySupported = function (beam, load) {
    this.beam = beam;
    this.load = load;
};

BeamAnalysis.analyzer.simplySupported.prototype = {
    getDeflectionEquation: function (beam, load) {
        const { primarySpan } = beam;
        const { EI, j2 } = beam.material.properties;
        const step = primarySpan / 8;
        const xValues = [], vValues = [];

        for (let i = 0; i <= primarySpan; i += step) {
            const x = parseFloat(i.toFixed(1));
            xValues.push(x);
            const V = -((load * x) / (24 * EI)) * (Math.pow(primarySpan, 3) - 2 * primarySpan * Math.pow(x, 2) + Math.pow(x, 3)) * j2 * 1000;
            vValues.push(parseFloat((V * 1e9).toFixed(1)));
        }

        return { x: xValues, y: vValues };
    },

    getBendingMomentEquation: function (beam, load) {
        const { primarySpan } = beam;
        const step = primarySpan / 10;
        const xValues = [], vValues = [];

        for (let i = 0; i <= primarySpan; i += step) {
            const x = parseFloat(i.toFixed(1));
            xValues.push(x);
            const V = (load * x / 2) * (primarySpan - x) * -1;
            vValues.push(parseFloat(V.toFixed(1)));
        }

        return { x: xValues, y: vValues };
    },

    getShearForceEquation: function (beam, load) {
        const { primarySpan } = beam;
        const step = primarySpan / 10;
        const xValues = [], vValues = [];

        for (let i = 0; i <= primarySpan; i += step) {
            const x = parseFloat(i.toFixed(1));
            xValues.push(x);
            const V = load * (primarySpan / 2 - x);
            vValues.push(parseFloat(V.toFixed(1)));
        }

        return { x: xValues, y: vValues };
    }
};

/**
 * Calculate deflection, bending stress and shear stress for a beam with two spans of equal condition
 *
 * @param {Beam}   beam   The beam object
 * @param {Number}  load    The applied load
 */
BeamAnalysis.analyzer.twoSpanUnequal = function (beam, load) {
    this.beam = beam;
    this.load = load;
};

BeamAnalysis.analyzer.twoSpanUnequal.prototype = {
    getDeflectionEquation: function (beam, load) {
        const { primarySpan, secondarySpan } = beam;
        const { EI, j2 } = beam.material.properties;
        const totalLength = primarySpan + secondarySpan;

        const { M1, R1, R2, R3 } = this.calculateSupports(primarySpan, secondarySpan, load);
        const step = totalLength / 1000;
        const xValues = [], vValues = [];

        for (let i = 0; i <= totalLength; i += step) {
            const x = parseFloat(i.toFixed(1));
            xValues.push(x);
            const V = this.calculateDeflectionValue(x, { primarySpan, secondarySpan, EI, j2, R1, R2, R3, load });
            vValues.push(parseFloat((V * 1e9).toFixed(1)));
        }

        return { x: xValues, y: vValues };
    },

    calculateDeflectionValue: function (x, { primarySpan, secondarySpan, EI, j2, R1, R2, R3, load }) {
        if (x <= primarySpan) {
            return ((x / (24 * EI)) * (4 * R1 * Math.pow(x, 2) - load * Math.pow(x, 3) + load * Math.pow(primarySpan, 3) - 4 * R1 * Math.pow(primarySpan, 2))) * j2 * 1000;
        } else {
            const span2_x = x - primarySpan;
            return (((R1 * x / 6) * (Math.pow(x, 2) - Math.pow(primarySpan, 2)) + (R2 * span2_x / 6) * (Math.pow(span2_x, 2) - 3 * primarySpan * span2_x + 3 * Math.pow(primarySpan, 2)) - R2 * Math.pow(primarySpan, 3) / 6 - (load * span2_x / 24) * (Math.pow(span2_x, 3) - Math.pow(secondarySpan, 3))) / EI) * j2 * 1000;
        }
    },

    getBendingMomentEquation: function (beam, load) {
        const { primarySpan, secondarySpan } = beam;
        const totalLength = primarySpan + secondarySpan;
        const { M1, R1, R2, R3 } = this.calculateSupports(primarySpan, secondarySpan, load);
        const step = totalLength / 1000;
        const xValues = [], vValues = [];

        for (let i = 0; i <= totalLength; i += step) {
            const x = parseFloat(i.toFixed(1));
            xValues.push(x);
            const V = this.calculateBendingMomentValue(x, { primarySpan, totalLength, R1, R2, load });
            vValues.push(parseFloat(V.toFixed(1)));
        }

        return { x: xValues, y: vValues };
    },

    calculateBendingMomentValue: function (x, { primarySpan, totalLength, R1, R2, load }) {
        if (x === 0 || x === totalLength) return 0;
        if (x < primarySpan) return -(R1 * x - 0.5 * load * Math.pow(x, 2));
        if (x > primarySpan) return -(R1 * x + R2 * (x - primarySpan) - 0.5 * load * Math.pow(x, 2));
        return -(R1 * primarySpan - 0.5 * load * Math.pow(primarySpan, 2));
    },

    getShearForceEquation: function (beam, load) {
        const { primarySpan, secondarySpan } = beam;
        const totalLength = primarySpan + secondarySpan;
        const { M1, R1, R2, R3 } = this.calculateSupports(primarySpan, secondarySpan, load);
        const step = totalLength / 1000;
        const xValues = [], vValues = [];

        for (let i = 0; i <= totalLength; i += step) {
            const x = parseFloat(i.toFixed(1));
            xValues.push(x);

            let V = this.calculateShearForceValue(x, { primarySpan, R1, R2, load });
            vValues.push(parseFloat(V.toFixed(1)));
        }

        return { x: xValues, y: vValues };
    },

    calculateShearForceValue: function (x, { primarySpan, R1, R2, load }) {
        if (x < primarySpan) return R1 - load * x;
        if (x === primarySpan) return R2 - load * x;
        return R2 - load * (x - primarySpan);
    },

    calculateSupports: function (primarySpan, secondarySpan, load) {
        const M1 = -((load * Math.pow(secondarySpan, 3)) + (load * Math.pow(primarySpan, 3))) / (8 * (primarySpan + secondarySpan));
        const R1 = (M1 / primarySpan) + ((load * primarySpan) / 2);
        const R3 = (M1 / secondarySpan) + ((load * secondarySpan) / 2);
        const R2 = (load * primarySpan) + (load * secondarySpan) - R1 - R3;
        return { M1, R1, R2, R3 };
    }
};
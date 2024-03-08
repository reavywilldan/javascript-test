'use strict';

/**
 * Plot result from the beam analysis calculation into a graph
 */
function AnalysisPlotter (container) {
    this.container = container;
}

AnalysisPlotter.prototype = {
    /**
     * Plot equation.
     *
     * @param {Object{beam : Beam, load : float, equation: Function}}  The equation data
     */
    plot : function (data) {
        console.log('Plotting data : ', data);
    },
};
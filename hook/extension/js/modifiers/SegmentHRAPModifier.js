/**
 *   SegmentHRAPModifier is responsible of ...
 */
function SegmentHRAPModifier() {

}

/**
 * Define prototype
 */
SegmentHRAPModifier.prototype = {

    modify: function modify() {

        this.hrapLoop = setInterval(function() {
            this.hrap();
        }.bind(this), 750);

    },

    hrap: function() {

        console.debug('Adding HRAP');

        var self = this;

        var results = $('#results');
        var resultsHeader = results.find("thead");

        this.pace = resultsHeader.find('th:contains("Pace")');

        this.pace.after('<th class="hrap">HRAP</th>');

        if (resultsHeader.find('.hrap').size()) {
            clearInterval(self.hrapLoop);
        }
    }
};

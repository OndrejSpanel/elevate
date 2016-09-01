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

        results.find("tbody").find("tr").appear().on("appear", function(e, $items) {

            $items.each(function() {

                var $row = $(this),
                    $cells = $row.find("td"); // cells are: Rank, Name, Date, Pace, **HRAP**, HR, VAM, Time

                if ($cells.filter('.hrap_pace').size()==0) {
                    var pace = $cells.eq(3);

                    pace.after('<td class="hrap_pace">?</td>');
                }

            });

        });

        $.force_appear();

        if (resultsHeader.find('.hrap').size()) {
            clearInterval(self.hrapLoop);
        }
    }
};

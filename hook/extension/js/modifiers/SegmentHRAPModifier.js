/**
 *   SegmentHRAPModifier is responsible of ...
 */
function SegmentHRAPModifier(userSettings, athleteId) {
    this.userSettings_ = userSettings;
    this.athleteId_ = athleteId;
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

        var hrrPercent = 90; // Lactate Threshold could be a reasonable value to show

        var targetHR = Helper.heartrateFromHeartRateReserve(hrrPercent, this.userSettings_.userMaxHr, this.userSettings_.userRestHr);

        var hrapTitle = 'title="Your pace recomputed for ' + hrrPercent + '% HRR (' + targetHR + ')"';

        this.pace = resultsHeader.find('th:contains("Pace")');

        this.pace.after('<th  '+ hrapTitle + ' class="hrap">HRAP</th>');


        results.find("tbody").find("tr").appear().on("appear", function(e, $items) {

            $items.each(function() {

                var $row = $(this),
                    $cells = $row.find("td"); // cells are: Rank, Name, Date, Pace, **HRAP**, HR, VAM, Time


                if ($cells.filter('.hrap_pace').size()==0) {
                    var athleteUrl = $cells.filter(".athlete").find("a").attr("href");
                    var athleteId = athleteUrl.split('/').pop();

                    var pace = $cells.eq(3);

                    var content = "";
                    if (self.athleteId_ == athleteId) {
                        content = "???";
                    }

                    pace.after('<td ' + hrapTitle + ' class="hrap_pace">' + content +'</td>');

                }

            });

        });

        $.force_appear();

        if (resultsHeader.find('.hrap').size()) {
            clearInterval(self.hrapLoop);
        }
    }
};

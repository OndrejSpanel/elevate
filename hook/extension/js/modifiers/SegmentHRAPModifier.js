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

        var restHR = this.userSettings_.userRestHr;
        var targetHR = Helper.heartrateFromHeartRateReserve(hrrPercent, this.userSettings_.userMaxHr, this.userSettings_.userRestHr);

        function getHrapTitle(name) {
            return 'title="Your ' + name +' recomputed for ' + hrrPercent + '% HRR (' + targetHR + ')"';
        }
        getHrapTitle();

        // TODO: get pace / speed column index
        this.pace = resultsHeader.find('th:contains("Pace")');
        this.speed = resultsHeader.find('th:contains("Speed")');
        this.hr = resultsHeader.find('th:contains("HR")');


        var isPace = this.pace.size() > 0;

        var hrapTitle = isPace ?  getHrapTitle("pace") : getHrapTitle("speed");
        var hrapShortTitle = isPace ? "HRAP" : "HRASpeed";

        this.hr.after('<th  '+ hrapTitle + ' class="hrap">' + hrapShortTitle + '</th>');

        var paceIndex = this.pace.index();
        var speedIndex = this.speed.index();
        var hrIndex = this.hr.index();



        results.find("tbody").find("tr").appear().on("appear", function(e, $items) {

            $items.each(function() {

                var $row = $(this),
                    $cells = $row.find("td"); // cells are: Rank, Name, Date, Pace, **HRAP**, HR, VAM, Time


                if ($cells.filter('.hrap_pace').size()==0) {
                    var athleteUrl = $cells.filter(".athlete").find("a").attr("href");
                    var athleteId = athleteUrl.split('/').pop();

                    var content = "";
                    if (self.athleteId_ == athleteId) {
                        try {
                            var pace = $cells.eq(paceIndex);
                            var hrText = $cells.eq(hrIndex).text();
                            var hr = parseInt(hrText);

                            if (hr > 0) { // parse failure is NaN, will not pass

                                var ratio = (hr - restHR) / (targetHR - restHR);

                                if (isPace) {
                                    var paceText = pace.text();
                                    var paceUnits = '/' + paceText.split('/').pop();
                                    var paceInSec = Helper.HHMMSStoSeconds(paceText);
                                    var hrapInSec = paceInSec * ratio;
                                    content = Helper.secondsToHHMMSS(hrapInSec, true) + paceUnits;
                                } else {
                                    var speed = parseFloat(pace.text());
                                    var hraSpeed = speed / ratio;
                                    content = hraSpeed.toFixed(1);

                                }
                            }
                        } catch (err) {
                        }

                    }

                    $cells.eq(4).after('<td ' + hrapTitle + ' class="hrap_pace">' + content +'</td>');

                }

            });

        });

        $.force_appear();

        if (resultsHeader.find('.hrap').size()) {
            clearInterval(self.hrapLoop);
        }
    }
};

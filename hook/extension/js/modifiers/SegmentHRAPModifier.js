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
            return 'title="Estimated ' + name +' at ' + hrrPercent + '% HRR (' + targetHR + ')"';
        }

        this.pace = resultsHeader.find('th:contains("Pace")');
        this.power = resultsHeader.find('th:contains("Power")');
        this.hr = resultsHeader.find('th:contains("HR")');


        var isPace = this.pace.size() > 0;

        var hrapTitle = isPace ?  getHrapTitle("pace") : getHrapTitle("power");
        var hrapShortTitle = isPace ? "HRAP" : "HRAPower";

        var paceIndex = this.pace.index();
        var powerIndex = this.power.index();
        var hrIndex = this.hr.index();

        var after = isPace ? this.hr : this.power;
        var afterIndex = isPace ? hrIndex : powerIndex;

        after.after('<th  ' + hrapTitle + ' class="hrap">' + hrapShortTitle + '</th>');

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
                            var hrText = $cells.eq(hrIndex).text();
                            var hr = parseInt(hrText);

                            if (hr > 0) { // parse failure is NaN, will not pass

                                var ratio = (hr - restHR) / (targetHR - restHR);

                                if (isPace) {
                                    var pace = $cells.eq(paceIndex);
                                    var paceText = pace.text();
                                    var paceUnits = '/' + paceText.split('/').pop();
                                    var paceInSec = Helper.HHMMSStoSeconds(paceText);
                                    var hrapInSec = paceInSec * ratio;
                                    content = Helper.secondsToHHMMSS(hrapInSec, true) + paceUnits;
                                } else {
                                    var powerCell = $cells.eq(powerIndex);
                                    var powerText = $.trim(powerCell.text());
                                    var power = parseFloat(powerText);
                                    var powerUnitsParse = /[0-9]*(.*)/g.exec(powerText);
                                    var powerUnits = powerUnitsParse.length > 1 ?  powerUnitsParse[1] : "";
                                    var hraPower = power / ratio;
                                    content = hraPower.toFixed(0) + powerUnits; // consider reading units from input instead

                                }
                            }
                        } catch (err) {
                        }

                    }

                    $cells.eq(afterIndex).after('<td ' + hrapTitle + ' class="hrap_pace">' + content +'</td>');

                }

            });

        });

        $.force_appear();

        if (resultsHeader.find('.hrap').size()) {
            clearInterval(self.hrapLoop);
        }
    }
};

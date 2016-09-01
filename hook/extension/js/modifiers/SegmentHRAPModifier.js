/**
 *   SegmentHRAPModifier is responsible of ...
 */
function SegmentHRAPModifier(userSettings, athleteId, segmentId) {
    this.userSettings_ = userSettings;
    this.athleteId_ = athleteId;
    this.segmentId_ = segmentId;
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

    findCurrentSegmentEffortsRange: function(segmentId, page, deferred, fastest, slowest) {

        if (!page) {
            page = 1;
        }
        if (!deferred) {
            deferred = $.Deferred();
        }

        var perPage = 50;

        var jqxhr = $.getJSON('/segments/' + segmentId + '/leaderboard?raw=true&page=' + page + '&per_page=' + perPage + '&viewer_context=false&filter=my_results');

        jqxhr.done(function(leaderboardData) {

            // Make any recursive leaderboardData fetched flatten with previous one
            leaderboardData.top_results.forEach(function(r) {
                var rTime = r.elapsed_time_raw;
                fastest = Helper.safeMin(fastest, rTime);
                slowest = Helper.safeMax(slowest, rTime);
            });

            if (leaderboardData.top_results.length == 0) {
                deferred.resolve(fastest, slowest);
            } else { // Not yet resolved then seek recursive on next page
                this.findCurrentSegmentEffortsRange(segmentId, page + 1, deferred, fastest, slowest);
            }

        }.bind(this)).fail(function(error) {

            deferred.reject(error);

        }.bind(this));

        return deferred.promise();
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

        var chart = $("#athlete-history-chart").find("svg");

        var marks = chart.find("circle").filter(".mark");

        var marksXY = $.map( marks, function(c) {
            return {'x': c.cx.baseVal.value, 'y': c.cy.baseVal.value};
        });

        var maxY, minY;
        marksXY.forEach(function(xy) {
            minY = Helper.safeMin(minY, xy.y);
            maxY = Helper.safeMax(maxY, xy.y);
        });

        var slowY = maxY;
        var fastY = minY;

        // parse my results
        var myEffortsRange = self.findCurrentSegmentEffortsRange(self.segmentId_).then(function(fastest, slowest) {
            function mapTimeToY(time) {
                return (time - fastest) / (slowest - fastest) * (slowY - fastY) + fastY;
            }
            function mapYToTime(y) {
                return (y - fastY) / (slowY - fastY) * (slowest - fastest) + fastest;
            }

            marksXY.forEach(function(xy) {
                var mTime = mapYToTime(xy.y);
                var hraTime = mTime * 0.9; // TODO: proper ratio - need complete leaderboard for this !!!
                console.debug(mapTimeToY(mTime));
                console.debug(mapTimeToY(hraTime));
            });

            console.debug (fastest + "-" + slowest);
        });


        $.force_appear();

        if (resultsHeader.find('.hrap').size()) {
            clearInterval(self.hrapLoop);
        }
    }
};

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

        var leadersTable = $('.leaders').find("table");

        //if ($('.percentageRanking').size())
        {
            clearInterval(self.hrapLoop);
        }
    }
};

function ActivitiesSynchronizer(appResources, userSettings) {
    this.appResources_ = appResources;
    this.userSettings_ = userSettings;
    this.extensionId_ = this.appResources_.extensionId;
}

ActivitiesSynchronizer.prototype = {

    /**
     * @return All activities with their stream
     */
    fetchWithStream: function(lastSyncUserDateTime) {

        var self = this;

        var deferred = Q.defer();

        // Start fetching missing activities
        self.fetchActivitiesRecursive(lastSyncUserDateTime).then(function success(activities) {

            console.log('Activities fetched: ' + activities.length);

            var fetchedActivitiesStreamCount = 0;
            var fetchedActivitiesProgress = 0;
            var promisesOfActivitiesStreamById = [];

            // For each activity, fetch his stream and compute extended stats
            _.each(activities, function(activity) {
                // Getting promise of stream for each activity...
                promisesOfActivitiesStreamById.push(self.fetchActivityStreamById(activity.id));
            });

            Q.allSettled(promisesOfActivitiesStreamById).then(function success(streamResults) {

                if (streamResults.length !== activities.length) {
                    var errMessage = 'Stream length mismatch with activities fetched length: ' + streamResults.length + ' != ' + activities.length + ')';
                    deferred.reject(errMessage);
                } else {

                    console.log('Stream length match with activities fetched length: (' + streamResults.length + ' == ' + activities.length + ')');

                    _.each(streamResults, function(data, index) {

                        if (data.state === 'rejected') {
                            // No stream found for this activity
                            console.warn('Stream not found for activity <' + data.reason.activityId + '>, index <' + index + '>', data);

                        } else if (data.state === 'fulfilled') {

                            // Then append stream to activity
                            var hasPowerMeter = true;
                            if (_.isEmpty(data.value.watts)) {
                                data.value.watts = data.value.watts_calc;
                                hasPowerMeter = false;
                            }

                            activities[index].hasPowerMeter = hasPowerMeter;
                            activities[index].stream = data.value;
                        }

                    });

                    // Finishing... force progress @ 100% because 'rejected' promises don't call progress callback
                    deferred.notify({
                        fetchedActivitiesStreamPercentage: 100
                    });

                    deferred.resolve(activities);
                }

            }, function error(err) {

                // We don't enter here with allSettled...

            }, function progress(notification) {

                fetchedActivitiesProgress = fetchedActivitiesStreamCount / activities.length * 100;

                deferred.notify({
                    fetchedActivitiesStreamPercentage: fetchedActivitiesProgress,
                    index: notification.index,
                    activityId: notification.value,
                });

                fetchedActivitiesStreamCount++;
            });

        }, function error(err) {

            deferred.reject(err);

        }, function progress(percentage) {

            deferred.notify({
                fetchActivitiesPercentage: percentage
            });
        });

        return deferred.promise;
    },

    fetchActivitiesRecursive: function(lastSyncUserDateTime, page, deferred, activitiesList) {

        var self = this;

        if (!page) {
            page = 1; // Usually start from first page when no page given
        }

        if (!deferred) {
            deferred = Q.defer();
        }

        if (!activitiesList) {
            activitiesList = [];
        }

        var activitiesUrl = '/athlete/training_activities?new_activity_only=false&per_page=200&page=' + page;

        var promiseActivitiesRequest = $.ajax(activitiesUrl);

        promiseActivitiesRequest.then(function success(data, textStatus, jqXHR) {

            if (textStatus !== 'success') {

                deferred.reject('Unable to get models' + textStatus);

            } else { // No errors...

                // overridde data total
                if (_.isEmpty(data.models)) { // No more activities to fetch, resolving promise here
                    console.log('Resolving with ' + activitiesList.length + ' activities found');
                    deferred.resolve(activitiesList);
                } else {

                    if (lastSyncUserDateTime) {

                        // Filter activities with start date upper than lastSyncUserDateTime
                        var activitiesCompliantWithLastSyncDateTime = _.filter(data.models, function(model) {
                            var activityEndTime = new Date(model.start_time).getTime() + model.elapsed_time_raw * 1000;
                            return (activityEndTime >= lastSyncUserDateTime.getTime());
                        });

                        // Append activities
                        activitiesList = _.flatten(_.union(activitiesList, activitiesCompliantWithLastSyncDateTime));

                        if (data.models.length > activitiesCompliantWithLastSyncDateTime.length) {
                            deferred.notify(100); // 100% Complete
                            deferred.resolve(activitiesList);
                        } else {
                            // Continue to fetch
                            deferred.notify(activitiesList.length / data.total * 100);
                            self.fetchActivitiesRecursive(lastSyncUserDateTime, page + 1, deferred, activitiesList);
                        }

                    } else {
                        // Append activities
                        activitiesList = _.flatten(_.union(activitiesList, data.models));
                        deferred.notify(activitiesList.length / data.total * 100);
                        self.fetchActivitiesRecursive(lastSyncUserDateTime, page + 1, deferred, activitiesList);
                    }
                }
            }

        }, function error(data, textStatus, errorThrown) {

            var err = {
                method: 'ActivitiesSynchronizer.fetchActivitiesRecursive',
                activitiesUrl: activitiesUrl,
                data: data,
                textStatus: textStatus,
                errorThrown: errorThrown,
            };

            console.error(err);
            deferred.reject(err);

        });

        return deferred.promise;
    },

    fetchActivityStreamById: function(activityId) {

        var self = this;

        var deferred = Q.defer();

        var activityStreamUrl = "/activities/" + activityId + "/streams?stream_types[]=watts_calc&stream_types[]=watts&stream_types[]=velocity_smooth&stream_types[]=time&stream_types[]=distance&stream_types[]=cadence&stream_types[]=heartrate&stream_types[]=grade_smooth&stream_types[]=altitude&stream_types[]=latlng";

        var promiseActivityStream = $.ajax(activityStreamUrl);

        promiseActivityStream.then(function success(data, textStatus, jqXHR) {

            deferred.notify(activityId);
            data.activityId = activityId; // Append activityId resolved data
            deferred.resolve(data);

        }, function error(data, textStatus, errorThrown) {

            deferred.reject({
                method: 'ActivitiesSynchronizer.fetchActivityStreamById',
                activityId: activityId,
                data: data,
                textStatus: textStatus,
                errorThrown: errorThrown,
            });

        });

        return deferred.promise;
    },

    clearSyncCache: function() {

        var self = this;

        var promise = Helper.removeFromStorage(self.extensionId_, StorageManager.storageLocalType, 'computedActivities').then(function() {
            console.log('computedActivities removed from local storage');
            return Helper.removeFromStorage(self.extensionId_, StorageManager.storageLocalType, 'lastSyncDateTime');
        }).then(function() {
            console.log('lastSyncDateTime removed from local storage');
        });

        return promise;
    },

    computeNewActivities: function() {

        var self = this;

        var deferred = Q.defer();

        Helper.getFromStorage(self.extensionId_, StorageManager.storageLocalType, 'lastSyncDateTime').then(function getLastSyncDateTimeSuccess(savedLastSyncDateTime) {

            if (savedLastSyncDateTime.data) {
                console.log('Last sync date time found: ', new Date(savedLastSyncDateTime.data));
            } else {
                console.log('No last sync date time found, starting full sync');
            }

            return self.fetchWithStream(new Date(savedLastSyncDateTime.data));

        }).then(function fetchWithStreamSuccess(activitiesWithStreams) {

            var activitiesProcessor = new ActivitiesProcessor(self.appResources_, self.userSettings_);
            return activitiesProcessor.compute(activitiesWithStreams);

        }, function fetchWithStreamError(err) {

            deferred.reject(err);

        }, function fetchWithStreamProgress(progress) {

            if (progress) deferred.notify(progress);

        }).then(function computeSuccess(computedActivities) {

            deferred.resolve(computedActivities);

        }, function computeError(err) {

            deferred.reject(err);

        }, function computeProgress(progress) {

            if (progress) deferred.notify(progress);

        });

        return deferred.promise;
    },

    sync: function() {

        var deferred = Q.defer();

        var self = this;

        this.newComputedActivities = null;

        this.computeNewActivities().then(function computeSuccess(newComputedActivities) {

            self.newComputedActivities = newComputedActivities;
            console.log(self.newComputedActivities.length + ' new activities computed.');
            return Helper.getFromStorage(self.extensionId_, StorageManager.storageLocalType, 'computedActivities');

        }, function computeError(err) {

            deferred.reject(err);

        }, function computeProgress(progress) {

            deferred.notify(progress);

        }).then(function successGetFromStorage(computedActivitiesStored) {

            if (_.isEmpty(computedActivitiesStored) || _.isEmpty(computedActivitiesStored.data)) {
                computedActivitiesStored = {};
                computedActivitiesStored.data = [];
            }

            var mergedActivities = _.flatten(_.union(self.newComputedActivities, computedActivitiesStored.data));

            // Sort mergedActivities ascending before save
            mergedActivities = _.sortBy(mergedActivities, function(item) {
                return (new Date(item.start_time)).getTime();
            });

            // TODO Check activities unicity
            console.log('// TODO Check activities id unicity here...');

            console.log('Now saving them to extension local storage...');

            // Save to chrome storage
            return Helper.setToStorage(self.extensionId_, StorageManager.storageLocalType, 'computedActivities', mergedActivities);

        }).then(function saveChromeLocalStorageSuccess(savedData) {

            // Helper.setToStorage promise resolved here
            console.log(savedData.data.computedActivities.length + ' activities were saved to extension local storage');

            return Helper.setToStorage(self.extensionId_, StorageManager.storageLocalType, 'lastSyncDateTime', (new Date()).getTime());

        }).then(function saveLastSyncDateTimeSuccess(saved) {

            console.log('Last sync date time saved: ', new Date(saved.data.lastSyncDateTime));
            deferred.resolve(saved.data);
        });

        return deferred.promise;
    },

    forceSync: function() {
        return this.clearSyncCache().then(function() {
            return this.sync();
        }.bind(this));
    }
};
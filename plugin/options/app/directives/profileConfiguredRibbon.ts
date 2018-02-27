import { ILocationService, IScope, IWindowService } from "angular";
import * as _ from "lodash";
import { AthleteSettingsController } from "../controllers/AthleteSettingsController";
import { ChromeStorageService } from "../services/ChromeStorageService";
import { AthleteProfileModel } from "../../../common/scripts/models/AthleteProfile";
import { UserSettingsModel } from "../../../common/scripts/models/UserSettings";
import { StorageManager } from "../../../common/scripts/modules/StorageManager";
import { routeMap } from "../Config";
import Tab = chrome.tabs.Tab;

export interface IProfileConfiguredRibbonScope extends IScope {
	checkLocalSyncedAthleteProfileEqualsRemote: () => void;
	isProfileConfigured: boolean;
	showHistoryNonConsistent: boolean;
	hideHistoryNonConsistent: () => void;
	syncNow: (forceSync: boolean) => void;
	setProfileConfiguredAndHide: () => void;
	goToAthleteSettings: () => void;
}

export class ProfileConfiguredRibbon {

	/**
	 *
	 * @param remoteAthleteProfile
	 * @param localAthleteProfile
	 * @return {boolean}
	 */
	public static remoteAthleteProfileEqualsLocal(remoteAthleteProfile: AthleteProfileModel, localAthleteProfile: AthleteProfileModel) { // TODO move outside ?!
		let remoteEqualsLocal: boolean = true;
		if (remoteAthleteProfile.userGender !== localAthleteProfile.userGender ||
			remoteAthleteProfile.userMaxHr !== localAthleteProfile.userMaxHr ||
			remoteAthleteProfile.userRestHr !== localAthleteProfile.userRestHr ||
			remoteAthleteProfile.userFTP !== localAthleteProfile.userFTP ||
			// remoteAthleteProfile.userSwimFTP !== localAthleteProfile.userSwimFTP ||
			remoteAthleteProfile.userWeight !== localAthleteProfile.userWeight) {
			remoteEqualsLocal = false; // Remote do not matches with local
		}
		return remoteEqualsLocal;
	}

	public static $inject: string[] = ["$scope", "ChromeStorageService", "$location", "$window"];

	constructor(public $scope: IProfileConfiguredRibbonScope, public chromeStorageService: ChromeStorageService, public $location: ILocationService, public $window: IWindowService) {

		// Considering that profile is configured at first. It's a nominal state before saying that is isn't
		$scope.isProfileConfigured = true;

		// Retrieve profile configured and display ribbon to inform user to configure it...
		chromeStorageService.getProfileConfigured().then((profileConfigured) => {
			$scope.isProfileConfigured = profileConfigured || !_.isEmpty(profileConfigured);
		});

		// Now check for athlete settings compliance between synced and local.
		// Inform user of re-sync if remote athlete settings have changed & a synchronisation exists
		// If yes show history non consistent message.
		$scope.checkLocalSyncedAthleteProfileEqualsRemote = () => {

			chromeStorageService.fetchUserSettings().then((userSettings: UserSettingsModel) => {

				if (!userSettings) {
					return null;
				}

				const remoteAthleteProfile: AthleteProfileModel = {
					userGender: userSettings.userGender,
					userMaxHr: userSettings.userMaxHr,
					userRestHr: userSettings.userRestHr,
					userFTP: userSettings.userFTP,
					// userSwimFTP: userSettings.userSwimFTP,
					userWeight: userSettings.userWeight,
				};

				chromeStorageService.getLocalSyncedAthleteProfile().then((localSyncedAthleteProfile: AthleteProfileModel) => {
					// A previous sync has be done with theses athlete settings...
					if (!_.isEmpty(localSyncedAthleteProfile)) {
						const remoteEqualsLocal: boolean = ProfileConfiguredRibbon.remoteAthleteProfileEqualsLocal(remoteAthleteProfile, localSyncedAthleteProfile);
						$scope.showHistoryNonConsistent = !remoteEqualsLocal;
					}
				});

			});
		};
		// ...Then execute...
		if (!StorageManager.getCookie("hide_history_non_consistent")) {
			$scope.checkLocalSyncedAthleteProfileEqualsRemote();
		}

		$scope.hideHistoryNonConsistent = () => {
			$scope.showHistoryNonConsistent = false;
			StorageManager.setCookieSeconds("hide_history_non_consistent", "true", 24 * 3600); // Set for 1 day
		};

		$scope.goToAthleteSettings = () => {
			$location.path(routeMap.athleteSettingsRoute);
		};

		$scope.setProfileConfiguredAndHide = () => {

			chromeStorageService.getProfileConfigured().then((isConfigured: boolean) => {
				if (!isConfigured) {
					chromeStorageService.setProfileConfigured(true).then(() => {
						console.log("Profile configured");
						$scope.isProfileConfigured = true;
					});
				} else {
					$scope.isProfileConfigured = isConfigured;
				}
			});
		};

		$scope.syncNow = (forceSync: boolean) => {
			chrome.tabs.getCurrent((tab: Tab) => {
				$window.open("https://www.strava.com/dashboard?stravissimoSync=true&forceSync=" + forceSync + "&sourceTabId=" + tab.id, "_blank", "width=700, height=675, location=0");
			});
		};

		$scope.$on(AthleteSettingsController.changedAthleteProfileMessage, () => {
			$scope.checkLocalSyncedAthleteProfileEqualsRemote();
		});

	}
}

export let profileConfiguredRibbon = [() => {

	return {
		controller: ProfileConfiguredRibbon,
		templateUrl: "directives/templates/profileConfiguredRibbon.html",

	} as any;
}];

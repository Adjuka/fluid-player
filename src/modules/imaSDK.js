// IMASDK support module
'use strict';
export default function (playerInstance, options) {
    playerInstance.initializeIMASDK = () => {

        const divAdDisplayContainer = document.createElement('div');
        divAdDisplayContainer.id = playerInstance.videoPlayerId + '_fluid_ad_container';
        divAdDisplayContainer.className = 'fluid_ad_container';

        divAdDisplayContainer.style.height = playerInstance.domRef.player.offsetHeight + 'px';
        divAdDisplayContainer.style.width = playerInstance.domRef.player.offsetWidth + 'px';

        playerInstance.domRef.player.parentNode.insertBefore(divAdDisplayContainer, playerInstance.domRef.player.nextSibling);

        playerInstance.imaSDKAdDisplayContainer = new google.ima.AdDisplayContainer(
            divAdDisplayContainer, playerInstance.domRef.player);

        playerInstance.imaSDKAdsLoader = new google.ima.AdsLoader(playerInstance.imaSDKAdDisplayContainer);

        playerInstance.imaSDKAdsLoader.getSettings().setVpaidMode(google.ima.ImaSdkSettings.VpaidMode.ENABLED);

        if(playerInstance.displayOptions.vastOptions.allowIMASDK.IMASDKVPAIDMode === 'disabled') {
            playerInstance.imaSDKAdsLoader.getSettings().setVpaidMode(google.ima.ImaSdkSettings.VpaidMode.DISABLED);
        } else if(playerInstance.displayOptions.vastOptions.allowIMASDK.IMASDKVPAIDMode === 'insecure') {
            playerInstance.imaSDKAdsLoader.getSettings().setVpaidMode(google.ima.ImaSdkSettings.VpaidMode.INSECURE);
        }

        playerInstance.imaSDKAdsLoader.addEventListener(
            google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            playerInstance.onIMASDKAdsManagerLoaded, false);

        playerInstance.imaSDKAdsLoader.addEventListener(
        google.ima.AdErrorEvent.Type.AD_ERROR, playerInstance.onIMASDKAdError, false);
    }

    playerInstance.onIMASDKAdsManagerLoaded = (adsManagerLoadedEvent) => {
        // Get the ads manager.
        let adsRenderingSettings = new google.ima.AdsRenderingSettings();
        adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
        // videoContent should be set to the content video element.
        playerInstance.imaSDKadsManager =
            adsManagerLoadedEvent.getAdsManager(playerInstance.domRef.player, adsRenderingSettings);

        // Add listeners to the required events.
        playerInstance.imaSDKadsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, playerInstance.onIMASDKAdError);
        playerInstance.imaSDKadsManager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, playerInstance.onIMASDKContentPauseRequested);
        playerInstance.imaSDKadsManager.addEventListener(
            google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
            playerInstance.onIMASDKContentResumeRequested);
        playerInstance.imaSDKadsManager.addEventListener(
            google.ima.AdEvent.Type.ALL_ADS_COMPLETED, playerInstance.onIMASDKAdEvent);

        // Listen to any additional events, if necessary.
        playerInstance.imaSDKadsManager.addEventListener(google.ima.AdEvent.Type.LOADED, playerInstance.onIMASDKAdEvent);
        playerInstance.imaSDKadsManager.addEventListener(google.ima.AdEvent.Type.STARTED, playerInstance.onIMASDKAdEvent);
        playerInstance.imaSDKadsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, playerInstance.onIMASDKAdEvent);
        playerInstance.imaSDKadsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, playerInstance.onIMASDKAdComplete);

        try {
            // Initialize the ads manager. Ad rules playlist will start at this time.
            playerInstance.imaSDKadsManager.init(playerInstance.domRef.player.offsetWidth, playerInstance.domRef.player.offsetHeight, google.ima.ViewMode.NORMAL);
            // Call play to start showing the ad. Single video and overlay ads will
            // start at this time; the call will be ignored for ad rules.
            if(playerInstance.displayOptions.layoutControls.mute) {
                playerInstance.imaSDKadsManager.setVolume(0);
            }

            playerInstance.imaSDKadsManager.start();
        } catch (adError) {
            //console.log(adError)
            // An error may be thrown if there was a problem with the VAST response.
            //playerInstance.domRef.player.play();
        }
    }

    playerInstance.processIMASDKWithRetries = (vastObj, backupTheVideoTime) => {
        let vastTag = vastObj.vastTag;
        const adListId = vastObj.id;

        playerInstance.adList[adListId].status = 'unknown';
        playerInstance.adList[adListId].vastLoaded = true;
        playerInstance.adList[adListId].adType = 'linear';

        const tmpOptions = {
            tracking: [],
            stopTracking: [],
            impression: [],
            clicktracking: [],
            vastLoaded: false
        };

        playerInstance.adPool[adListId] = Object.assign({}, tmpOptions);

        const event = document.createEvent('Event');

        event.initEvent('adId_' + adListId, false, true);
        playerInstance.domRef.player.dispatchEvent(event);
        playerInstance.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();

        if (playerInstance.hasTitle()) {
            const title = document.getElementById(playerInstance.videoPlayerId + '_title');
            title.style.display = 'none';
        }
    }

    playerInstance.RenderIMASDKAd = (adListId, backupTheVideoTime) => {
        playerInstance.toggleLoader(true);

        //get the proper ad
        playerInstance.vastOptions = playerInstance.adPool[adListId];

        if (backupTheVideoTime) {
            playerInstance.backupMainVideoContentTime(adListId);
        }

        const playVideoPlayer = adListId => {
            //playerInstance.switchPlayerToIMASDKMode = adListId => {
                playerInstance.debugMessage('starting function switchPlayerToIMASDKMode');
                playerInstance.imaSDKAdDisplayContainer.initialize();

                playerInstance.imaSDKadsRequest = new google.ima.AdsRequest();
                playerInstance.imaSDKadsRequest.adTagUrl = playerInstance.adList[adListId].vastTag;
                playerInstance.imaSDKadsRequest.adObject = playerInstance.adList[adListId];

                playerInstance.imaSDKAdsLoader.requestAds(playerInstance.imaSDKadsRequest);
            //}

            playerInstance.domRef.player.pause();

            // Remove the streaming objects to prevent errors on the VAST content
            playerInstance.detachStreamers();

            playerInstance.toggleLoader(false);
            playerInstance.adList[adListId].played = true;
            playerInstance.adFinished = false;
        }

        playVideoPlayer(adListId);
    }

    playerInstance.onIMASDKAdError = (adErrorEvent) => {
        //console.log(adErrorEvent);
        //playerInstance.domRef.player.play();
    };

    playerInstance.onIMASDKAdEvent = (adEvent) => {
    };

    playerInstance.onIMASDKAdComplete = (adEvent) => {
        playerInstance.adFinished = true;

        // TEMPORARY!!!! DO THIS PROPERLY
        playerInstance.imaSDKadsRequest.adObject.status = 'complete';
        playerInstance.displayOptions.vastOptions.vastAdvanced.vastVideoEndedCallback(playerInstance.imaSDKadsRequest.adObject);

        // Next Ad
        playerInstance.checkForNextAd();
    };

    playerInstance.onIMASDKContentPauseRequested = () => {
    };

    playerInstance.onIMASDKContentResumeRequested = () => {
    };

    // TODO: ???
    playerInstance.switchPlayerToIMASDKMode = () => {
    };
}

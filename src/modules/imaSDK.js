// IMASDK support module
'use strict';
export default function (playerInstance, options) {
    playerInstance.initializeIMASDK = () => {

        console.log('Initializing');

        const divAdDisplayContainer = document.createElement('div');
        divAdDisplayContainer.id = playerInstance.videoPlayerId + '_fluid_ad_container';
        divAdDisplayContainer.className = 'fluid_ad_container';
        playerInstance.domRef.player.parentNode.insertBefore(divAdDisplayContainer, playerInstance.domRef.player.nextSibling);

        playerInstance.imaSDKAdDisplayContainer = new google.ima.AdDisplayContainer(
            divAdDisplayContainer, playerInstance.domRef.player);

        playerInstance.imaSDKAdsLoader = new google.ima.AdsLoader(playerInstance.imaSDKAdDisplayContainer);

        console.log('Trying eventListener');

        console.log(playerInstance.imaSDKAdsLoader);

        playerInstance.imaSDKAdsLoader.addEventListener(
            google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            playerInstance.onIMASDKAdsManagerLoaded, false);

        playerInstance.imaSDKAdsLoader.addEventListener(
        google.ima.AdErrorEvent.Type.AD_ERROR, playerInstance.onIMASDKAdError, false);
    }

    playerInstance.onIMASDKAdsManagerLoaded = (adsManagerLoadedEvent) => {
        console.log('AdsManager Loaded');
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

        try {
            console.log('Start Ad');
            // Initialize the ads manager. Ad rules playlist will start at this time.
            playerInstance.imaSDKadsManager.init(640, 360, google.ima.ViewMode.NORMAL);
            // Call play to start showing the ad. Single video and overlay ads will
            // start at this time; the call will be ignored for ad rules.
            playerInstance.imaSDKadsManager.start();
        } catch (adError) {
            console.log(adError)
            // An error may be thrown if there was a problem with the VAST response.
            //videoContent.play();
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

        console.log('adId_' + adListId);
        event.initEvent('adId_' + adListId, false, true);
        playerInstance.domRef.player.dispatchEvent(event);
        playerInstance.displayOptions.vastOptions.vastAdvanced.vastLoadedCallback();

        if (playerInstance.hasTitle()) {
            const title = document.getElementById(playerInstance.videoPlayerId + '_title');
            title.style.display = 'none';
        }

        console.log('Process');
    }

    playerInstance.RenderIMASDKAd = (adListId, backupTheVideoTime) => {
        playerInstance.toggleLoader(true);

        //get the proper ad
        playerInstance.vastOptions = playerInstance.adPool[adListId];

        console.log('EEEE');

        if (backupTheVideoTime) {
            playerInstance.backupMainVideoContentTime(adListId);
        }

        console.log('Noice');

        const playVideoPlayer = adListId => {
            console.log('Called');
            //playerInstance.switchPlayerToIMASDKMode = adListId => {

                playerInstance.imaSDKAdDisplayContainer.initialize();

                let adsRequest = new google.ima.AdsRequest();
                adsRequest.adTagUrl = playerInstance.adList[adListId].vastTag;

                playerInstance.imaSDKAdsLoader.requestAds(adsRequest);
            //}
        }

        playVideoPlayer(adListId);
    }

    playerInstance.onIMASDKAdError = (adErrorEvent) => {
        console.log(adErrorEvent.getError());
    };

    playerInstance.onIMASDKAdEvent = (adEvent) => {
    };

    playerInstance.onIMASDKContentPauseRequested = () => {
    };

    playerInstance.onIMASDKContentResumeRequested = () => {
    };

    // TODO: ???
    playerInstance.switchPlayerToIMASDKMode = () => {
    };
}

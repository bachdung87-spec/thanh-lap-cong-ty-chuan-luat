/**
 * UTM Tracker & Analytics Event Dispatcher
 * CÔNG TY TNHH KẾ TOÁN THUẾ CHUẨN LUẬT
 */

(function () {
  'use strict';

  var UTM_STORAGE_KEY = 'chuanluat_attribution_data';

  function parseQueryParams() {
    var params = {};
    var search = window.location.search.substring(1);
    if (!search) return params;
    
    var pairs = search.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      var key = decodeURIComponent(pair[0]);
      var value = decodeURIComponent(pair[1] || '');
      params[key] = value;
    }
    return params;
  }

  function getStoredAttribution() {
    try {
      var data = localStorage.getItem(UTM_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function saveAttribution(data) {
    try {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save attribution data to localStorage', e);
    }
  }

  function initTracker() {
    var currentParams = parseQueryParams();
    var stored = getStoredAttribution();

    var trackKeys = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'ttclid'
    ];

    var updated = Object.assign({}, stored);
    var hasNewUTM = false;

    trackKeys.forEach(function (key) {
      if (currentParams[key]) {
        updated[key] = currentParams[key];
        hasNewUTM = true;
      }
    });

    if (hasNewUTM || !updated.first_visit) {
      updated.first_visit = updated.first_visit || new Date().toISOString();
      updated.last_visit = new Date().toISOString();
      updated.referrer = updated.referrer || document.referrer || 'direct';
      saveAttribution(updated);
    }

    // Populate all forms with UTM fields
    populateForms(updated);
  }

  function populateForms(attribution) {
    var forms = document.querySelectorAll('form');
    forms.forEach(function (form) {
      for (var key in attribution) {
        if (attribution.hasOwnProperty(key)) {
          var input = form.querySelector('input[name="' + key + '"]');
          if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            form.appendChild(input);
          }
          input.value = attribution[key];
        }
      }
    });
  }

  // Analytics event dispatcher
  window.trackEvent = function (eventName, eventParams) {
    eventParams = eventParams || {};
    var attribution = getStoredAttribution();
    var fullPayload = Object.assign({}, attribution, eventParams, {
      timestamp: new Date().toISOString()
    });

    console.log('[Tracking Event]', eventName, fullPayload);

    // Google Tag Manager / GA4
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: eventName,
        eventData: fullPayload
      });
    }

    // Facebook Pixel (Meta)
    if (typeof window.fbq === 'function') {
      if (eventName === 'generate_lead') {
        window.fbq('track', 'Lead', fullPayload);
      } else {
        window.fbq('trackCustom', eventName, fullPayload);
      }
    }

    // TikTok Pixel
    if (typeof window.ttq === 'object' && typeof window.ttq.track === 'function') {
      if (eventName === 'generate_lead') {
        window.ttq.track('SubmitForm', fullPayload);
      } else {
        window.ttq.track(eventName, fullPayload);
      }
    }
  };

  // Expose helper to get attribution
  window.getAttributionData = getStoredAttribution;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracker);
  } else {
    initTracker();
  }
})();

var $ = require('jquery');
var cdb = require('cartodb.js');
var Client = require('app/windshaft/client');

describe('windshaft/client', function () {
  it('should throw an error if required options are not passed to the constructor', function () {
    expect(function () {
      new Client({}, ['urlTemplate', 'userName', 'endpoint', 'statTag']); // eslint-disable-line
    }).toThrowError('The following options are required: urlTemplate, userName, endpoint, statTag');
  });

  describe('#instantiateMap', function () {
    beforeEach(function () {
      this.previousAjax = $.ajax;

      $.ajax = function (params) {
        this.ajaxParams = params;
      }.bind(this);

      cdb.core.util.uniqueCallbackName = function () {
        return 'callbackName';
      };

      this.client = new Client({
        urlTemplate: 'https://{user}.example.com:443',
        userName: 'rambo',
        statTag: 'stat_tag',
        endpoint: 'api/v1'
      });
    });

    afterEach(function () {
      $.ajax = this.previousAjax;
    });

    it('should trigger a GET request to instantiate a map', function () {
      this.client.instantiateMap({
        mapDefinition: { some: 'json that must be encoded' },
        filters: { some: 'filters that will be applied' }
      });

      var url = this.ajaxParams.url.split('?')[0];
      var params = this.ajaxParams.url.split('?')[1].split('&');

      expect(url).toEqual('https://rambo.example.com:443/api/v1');
      expect(params[0]).toEqual('stat_tag=stat_tag');
      expect(params[1]).toEqual('filters=%7B%22some%22%3A%22filters%20that%20will%20be%20applied%22%7D');
      expect(params[2]).toEqual('config=%7B%22some%22%3A%22json%20that%20must%20be%20encoded%22%7D');
      expect(this.ajaxParams.method).toEqual('GET');
      expect(this.ajaxParams.dataType).toEqual('jsonp');
      expect(this.ajaxParams.jsonpCallback).toEqual('_cdbc_callbackName');
      expect(this.ajaxParams.cache).toEqual(true);
    });

    it('should invoke the success callback with an instance of the dasboard', function () {
      var successCallback = jasmine.createSpy('successCallback');

      this.client.instantiateMap({
        mapDefinition: 'mapDefinition',
        filters: {},
        success: successCallback
      });

      this.ajaxParams.success({});

      expect(successCallback).toHaveBeenCalled();
      var dasboardInstance = successCallback.calls.mostRecent().args[0];

      expect(dasboardInstance).toBeDefined();
      expect(dasboardInstance.getBaseURL()).toEqual('https://rambo.example.com:443/api/v1/map/');
    });

    it('should invoke the error callback if Windshaft returns some errors', function () {
      var errorCallback = jasmine.createSpy('errorCallback');

      this.client.instantiateMap({
        mapDefinition: 'mapDefinition',
        filters: {},
        error: errorCallback
      });

      this.ajaxParams.success({
        errors: [ 'something went wrong!' ]
      });

      expect(errorCallback).toHaveBeenCalledWith('something went wrong!');
    });

    it('should invoke the error callback if ajax request goes wrong', function () {
      var errorCallback = jasmine.createSpy('errorCallback');

      this.client.instantiateMap({
        mapDefinition: 'mapDefinition',
        filters: {},
        error: errorCallback
      });

      this.ajaxParams.error({ responseText: 'something went wrong!' });

      expect(errorCallback).toHaveBeenCalledWith('Unknown error');
    });

    it('should use POST if forceCors is true', function () {
      spyOn(cdb.core.util, 'isCORSSupported').and.returnValue(true);

      this.client = new Client({
        urlTemplate: 'https://{user}.example.com:443',
        userName: 'rambo',
        statTag: 'stat_tag',
        endpoint: 'api/v1',
        forceCors: true
      });

      this.client.instantiateMap({
        mapDefinition: { some: 'json that must be encoded' },
        filters: { some: 'filters that will be applied' }
      });

      var url = this.ajaxParams.url.split('?')[0];
      var params = this.ajaxParams.url.split('?')[1].split('&');

      expect(url).toEqual('https://rambo.example.com:443/api/v1');
      expect(params[0]).toEqual('stat_tag=stat_tag');
      expect(params[1]).toEqual('filters=%7B%22some%22%3A%22filters%20that%20will%20be%20applied%22%7D');
      expect(this.ajaxParams.crossOrigin).toEqual(true);
      expect(this.ajaxParams.method).toEqual('POST');
      expect(this.ajaxParams.dataType).toEqual('json');
      expect(this.ajaxParams.contentType).toEqual('application/json');
    });

    it('should use POST if payload is too big to be sent as a URL param', function () {
      spyOn(cdb.core.util, 'isCORSSupported').and.returnValue(true);

      this.client = new Client({
        urlTemplate: 'https://{user}.example.com:443',
        userName: 'rambo',
        statTag: 'stat_tag',
        endpoint: 'api/v1',
        forceCors: false
      });

      var mapDefinition = { key: '' };
      for (var i = 0; i < 3000; i++) {
        mapDefinition.key += 'x';
      }

      this.client.instantiateMap({
        mapDefinition: mapDefinition,
        filters: { some: 'filters that will be applied' }
      });

      var url = this.ajaxParams.url.split('?')[0];
      var params = this.ajaxParams.url.split('?')[1].split('&');

      expect(url).toEqual('https://rambo.example.com:443/api/v1');
      expect(params[0]).toEqual('stat_tag=stat_tag');
      expect(params[1]).toEqual('filters=%7B%22some%22%3A%22filters%20that%20will%20be%20applied%22%7D');
      expect(this.ajaxParams.crossOrigin).toEqual(true);
      expect(this.ajaxParams.method).toEqual('POST');
      expect(this.ajaxParams.dataType).toEqual('json');
      expect(this.ajaxParams.contentType).toEqual('application/json');
    });

    it('should NOT use POST if forceCors is true but cors is not supported', function () {
      spyOn(cdb.core.util, 'isCORSSupported').and.returnValue(false);

      this.client = new Client({
        urlTemplate: 'https://{user}.example.com:443',
        userName: 'rambo',
        statTag: 'stat_tag',
        endpoint: 'api/v1',
        forceCors: true
      });

      this.client.instantiateMap({
        mapDefinition: { some: 'json that must be encoded' },
        filters: { some: 'filters that will be applied' }
      });

      expect(this.ajaxParams.method).toEqual('GET');
    });
  });
});

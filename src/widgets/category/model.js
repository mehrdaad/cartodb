var _ = require('underscore');
var CategoryColors = require('./models/category-colors');
var WidgetModel = require('../widget-model');
var WidgetSearchModel = require('./models/search-model');
var CategoryModelRange = require('./models/category-model-range');
var CategoriesCollection = require('./models/categories-collection');
var LockedCatsCollection = require('./models/locked-categories-collection');

/**
 *  Category widget model
 *
 *  - It has several internal models/collections
 *
 *  · search model: it manages category search results.
 *  · locked collection: it stores locked items.
 *  · filter model: it knows which items are accepted or rejected.
 *
 */

module.exports = WidgetModel.extend({
  url: function () {
    return this.get('url') + '?bbox=' + this.get('boundingBox') + '&own_filter=' + (this.get('locked') ? 1 : 0);
  },

  initialize: function (attrs, opts) {
    this._data = new CategoriesCollection();

    WidgetModel.prototype.initialize.call(this, attrs, opts);

    // Locked categories collection
    this.locked = new LockedCatsCollection();

    // Internal model for calculating total amount of values in the category
    this.rangeModel = new CategoryModelRange();

    // Colors class
    this.colors = new CategoryColors();

    // Search model
    this.search = new WidgetSearchModel({}, {
      locked: this.locked
    });
  },

  // Set any needed parameter when they have changed in this model
  _setInternalModels: function () {
    var url = this.get('url');

    this.search.set({
      url: url,
      boundingBox: this.get('boundingBox')
    });

    this.rangeModel.setUrl(url);
  },

  _onChangeBinds: function () {
    this._setInternalModels();

    this.rangeModel.bind('change:totalCount', function (mdl, value) {
      this.set('totalCount', value);
    }, this);

    this.bind('change:url', function () {
      if (this.get('sync') && !this.isCollapsed()) {
        this._fetch();
      }
    }, this);

    this.bind('change:boundingBox', function () {
      // If a search is applied and bounding bounds has changed,
      // don't fetch new raw data
      if (this.get('bbox') && !this.isSearchApplied() && !this.isCollapsed()) {
        this._fetch();
      }
    }, this);

    this.bind('change:url change:boundingBox', function () {
      this.search.set({
        url: this.get('url'),
        boundingBox: this.get('boundingBox')
      });
    }, this);

    this.bind('change:collapsed', function (mdl, isCollapsed) {
      if (!isCollapsed) {
        if (mdl.changedAttributes(this._previousAttrs)) {
          this._fetch();
        }
      } else {
        this._previousAttrs = {
          url: this.get('url'),
          boundingBox: this.get('boundingBox')
        };
      }
    }, this);

    this.locked.bind('change add remove', function () {
      this.trigger('change:lockCollection', this.locked, this);
    }, this);

    this.search.bind('loading', function () {
      this.trigger('loading', this);
    }, this);
    this.search.bind('sync', function () {
      this.trigger('sync', this);
    }, this);
    this.search.bind('error', function (e) {
      if (!e || (e && e.statusText !== 'abort')) {
        this.trigger('error', this);
      }
    }, this);
    this.search.bind('change:data', function () {
      this.trigger('change:searchData', this.search, this);
    }, this);
  },

  /*
   *  Helper methods for internal models/collections
   *
   */

  applyCategoryColors: function () {
    this.set('categoryColors', true);
    var colorsData = this._data.map(function (m) {
      return [ m.get('name'), m.get('color') ];
    });
    this.trigger('applyCategoryColors', colorsData, this);
  },

  cancelCategoryColors: function () {
    this.set('categoryColors', false);
    this.trigger('cancelCategoryColors', this);
  },

  isColorApplied: function () {
    return this.get('categoryColors');
  },

  // Locked collection helper methods //

  getLockedSize: function () {
    return this.locked.size();
  },

  isLocked: function () {
    return this.get('locked');
  },

  canBeLocked: function () {
    return this.isLocked() ||
    this.getAcceptedCount() > 0;
  },

  canApplyLocked: function () {
    var acceptedCollection = this.filter.getAccepted();
    if (this.filter.getAccepted().size() !== this.locked.size()) {
      return true;
    }

    return acceptedCollection.find(function (m) {
      return !this.locked.isItemLocked(m.get('name'));
    }, this);
  },

  applyLocked: function () {
    var currentLocked = this.locked.getItemsName();
    if (!currentLocked.length) {
      this.unlockCategories();
      return false;
    }
    this.set('locked', true);
    this.filter.cleanFilter(false);
    this.filter.accept(currentLocked);
    this.filter.applyFilter();
    this.cleanSearch();
  },

  lockCategories: function () {
    this.set('locked', true);
    this._fetch();
  },

  unlockCategories: function () {
    this.set('locked', false);
    this.acceptAll();
  },

  // Search model helper methods //

  getSearchQuery: function () {
    return this.search.getSearchQuery();
  },

  setSearchQuery: function (q) {
    this.search.set('q', q);
  },

  isSearchValid: function () {
    return this.search.isValid();
  },

  getSearchResult: function () {
    return this.search.getData();
  },

  getSearchCount: function () {
    return this.search.getCount();
  },

  applySearch: function () {
    this.search.fetch();
  },

  isSearchApplied: function () {
    return this.search.isSearchApplied();
  },

  cleanSearch: function () {
    this.locked.resetItems([]);
    this.search.resetData();
  },

  setupSearch: function () {
    if (!this.isSearchApplied()) {
      var acceptedCats = this.filter.getAccepted().toJSON();
      this.locked.addItems(acceptedCats);
      this.search.setData(
        this._data.toJSON()
      );
    }
  },

  // Filter model helper methods //

  getRejectedCount: function () {
    return this.filter.rejectedCategories.size();
  },

  getAcceptedCount: function () {
    return this.filter.acceptedCategories.size();
  },

  acceptFilters: function (values) {
    this.filter.accept(values);
  },

  rejectFilters: function (values) {
    this.filter.reject(values);
  },

  rejectAll: function () {
    this.filter.rejectAll();
  },

  acceptAll: function () {
    this.filter.acceptAll();
  },

  isAllFiltersRejected: function () {
    return this.filter.get('rejectAll');
  },

  // Proper model helper methods //

  getData: function () {
    return this._data;
  },

  getSize: function () {
    return this._data.size();
  },

  getCount: function () {
    return this.get('categoriesCount');
  },

  isOtherAvailable: function () {
    return this._data.isOtherAvailable();
  },

  refresh: function () {
    if (this.isSearchApplied()) {
      this.search.fetch();
    } else {
      this._fetch();
    }
  },

  // Data parser methods //

  _parseData: function (categories) {
    var newData = [];
    var _tmpArray = {};
    var acceptedCats = this.filter.getAccepted();

    // Update colors by data categories
    this.colors.updateData(
      _.uniq(
        _.union(
          _.pluck(categories, 'category'),
          _.pluck(acceptedCats, 'name')
        )
      )
    );

    _.each(categories, function (datum, i) {
      var category = datum.category;
      var isRejected = this.filter.isRejected(category);
      _tmpArray[category] = true;

      newData.push({
        selected: !isRejected,
        name: category,
        agg: datum.agg,
        value: datum.value,
        color: this.colors.getColorByCategory(category)
      });
    }, this);

    if (this.isLocked()) {
      // Add accepted items that are not present in the categories data
      acceptedCats.each(function (mdl, i) {
        var category = mdl.get('name').toString();
        if (!_tmpArray[category]) {
          newData.push({
            selected: true,
            color: this.colors.getColorByCategory(category),
            name: category,
            agg: false,
            value: 0
          });
        }
      }, this);
    }

    return {
      data: newData
    };
  },

  setCategories: function (d) {
    var attrs = this._parseData(d);
    this._data.reset(attrs.data);
    this.set(attrs);
    if (this.isColorApplied()) {
      this.applyCategoryColors();
    }
  },

  parse: function (d) {
    var categories = d.categories;
    var attrs = this._parseData(categories);

    _.extend(attrs, {
      nulls: d.nulls,
      min: d.min,
      max: d.max,
      count: d.count,
      categoriesCount: d.categoriesCount
    }
    );
    this._data.reset(attrs.data);
    if (this.isColorApplied()) {
      this.applyCategoryColors();
    }
    return attrs;
  },

  // Backbone toJson function override

  toJSON: function () {
    return {
      type: 'aggregation',
      options: {
        column: this.get('column'),
        aggregation: this.get('aggregation'),
        aggregationColumn: this.get('aggregationColumn')
      }
    };
  }

});

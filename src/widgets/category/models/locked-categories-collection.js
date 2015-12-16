var _ = require('underscore');
var cdb = require('cartodb.js');
var CategoryItemModel = require('./category-item-model');

/**
 *  Locked categories collection
 *
 */

module.exports = cdb.Backbone.Collection.extend({
  model: CategoryItemModel,

  addItem: function (mdl) {
    if (!this.isItemLocked(mdl.get('name'))) {
      this.add(mdl);
    }
  },

  addItems: function (mdls) {
    _.each(mdls, function (m) {
      if (!this.isItemLocked(m.name)) {
        this.add(m);
      }
    }, this);
  },

  resetItems: function (mdls) {
    this.reset(mdls);
  },

  removeItem: function (mdl) {
    var lockedItem = this.isItemLocked(mdl.get('name'));
    if (lockedItem) {
      this.remove(lockedItem);
    }
  },

  removeItems: function () {
    this.reset([]);
  },

  isItemLocked: function (name) {
    return this.find(function (d) {
      return d.get('name') === name;
    });
  },

  getItemsName: function () {
    return this.pluck('name');
  }

});

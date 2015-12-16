var $ = require('jquery');
var CategoryItemsView = require('./items-view');
var WidgetSearchCategoryItemView = require('./item/search-item-view');
var placeholder = require('./search-items-no-results-template.tpl');

/**
 * Category list view
 */
module.exports = CategoryItemsView.extend({
  className: 'CDB-Widget-list is-hidden CDB-Widget-list--wrapped js-list',

  render: function () {
    this.clearSubViews();
    this.$el.empty();
    var data = this.dataModel.getSearchResult();
    var isDataEmpty = data.isEmpty() || data.size() === 0;

    if (isDataEmpty) {
      this._renderPlaceholder();
    } else {
      this._renderList();
    }
    return this;
  },

  _renderList: function () {
    this.$el.removeClass('CDB-Widget-list--withBorders CDB-Widget-list--noresults');
    this.$el.addClass('CDB-Widget-list--wrapped');

    var groupItem;
    var data = this.dataModel.getSearchResult();

    data.each(function (mdl, i) {
      if (i % this.options.itemsPerPage === 0) {
        groupItem = $('<div>').addClass('CDB-Widget-listGroup');
        this.$el.append(groupItem);
      }
      this._addItem(mdl, groupItem);
    }, this);
  },

  _renderPlaceholder: function () {
    // Change view classes
    this.$el
      .addClass('CDB-Widget-list--noresults')
      .removeClass('CDB-Widget-list--wrapped');

    this.$el.html(
      placeholder({
        q: this.dataModel.getSearchQuery()
      })
    );
  },

  _addItem: function (mdl, $parent) {
    var v = new WidgetSearchCategoryItemView({
      model: mdl,
      dataModel: this.dataModel
    });
    this.addView(v);
    $parent.append(v.render().el);
  },

  toggle: function () {
    this[this.viewModel.isSearchEnabled() ? 'show' : 'hide']();
  }

});

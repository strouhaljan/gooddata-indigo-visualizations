import { string } from '@gooddata/js-utils';
import { findIndex, isArray, isObject, clamp, cloneDeep, assign } from 'lodash';
import cx from 'classnames';

import {
    colors2Object,
    numberFormat
} from '@gooddata/numberjs';

import { parseValue, getMeasureHeader, getAttributeHeader } from '../utils/common';

import { DEFAULT_ROW_HEIGHT, DEFAULT_HEADER_HEIGHT, DEFAULT_FOOTER_ROW_HEIGHT } from './TableVisualization';

import { ASC, DESC } from './Sort';

const HEADER_PADDING = 8;
const MOBILE_SORT_TOOLTIP_OFFSET = 20;

const ALIGN_LEFT = 'left';
const ALIGN_RIGHT = 'right';

const FULLSCREEN_TOOLTIP_VIEWPORT_THRESHOLD = 480;

const simplifyText = string.simplifyText;

function getCssClass(value, prefix = '') {
    return prefix + simplifyText(value);
}

export function getMetricsFromHeaders(headers) {
    const metrics = [];

    headers.forEach((header, i) => {
        if (header.type === 'metric') {
            metrics.push({
                index: i,
                header
            });
        }
    });

    return metrics;
}

export function parseMetricValues(headers, rawData) {
    const metrics = getMetricsFromHeaders(headers);

    return rawData.map((row) => {
        const rowWithParsedValues = cloneDeep(row);
        metrics.forEach((metric) => {
            rowWithParsedValues[metric.index] = parseValue(rowWithParsedValues[metric.index]);
        });
        return rowWithParsedValues;
    });
}

function findFirstSort(items, typeName) {
    if (!isArray(items) || !typeName) return null;

    const array = items.map(item => item[typeName]);
    let index = findIndex(array, item => !!item.sort);
    if (index === -1) { return null; }

    const item = array[index];

    if (isObject(item.sort)) { // measure only
        if (item.showPoP && !item.sort.sortByPoP) {
            index += 1;
        }
    } else if (item.showPoP) {
        // TODO: backward compatibility, remove if branch after CL-9654 will be released
        index += 1;
    }

    return { index, item };
}

const buildSortInfo = (sortBy, sortDir) => ({ sortBy, sortDir });

export function getSortInfo(config) {
    if (!config) { return {}; }

    const { buckets } = config;
    let sort = findFirstSort(buckets.categories, 'category');
    if (sort) {
        return buildSortInfo(sort.index, sort.item.sort);
    }

    sort = findFirstSort(buckets.measures, 'measure');
    if (sort) {
        const categoriesCount = isArray(buckets.categories) && buckets.categories.length;
        const index = sort.index + categoriesCount;

        // TODO: backward compatibility, remove "sort.item.sort" after CL-9654 will be released
        return buildSortInfo(index, sort.item.sort.direction || sort.item.sort);
    }

    return {};
}

export function getColumnAlign(column) {
    return (column.type === 'metric') ? ALIGN_RIGHT : ALIGN_LEFT;
}

function fullscreenTooltipEnabled() {
    return document.documentElement.clientWidth <= FULLSCREEN_TOOLTIP_VIEWPORT_THRESHOLD;
}

export function calculateArrowPositions(column, tableScrollX, tableWrapRef) {
    if (!fullscreenTooltipEnabled()) {
        return null;
    }
    const tableWrapRect = tableWrapRef.getBoundingClientRect();
    const isLeftAligned = column.align === ALIGN_LEFT;

    // diff between table position and fixed tooltip left offset
    const offsetLeft = tableWrapRect.left - MOBILE_SORT_TOOLTIP_OFFSET;

    // prevent arrow to show outside the table
    const min = offsetLeft + HEADER_PADDING;
    const max = tableWrapRect.right - MOBILE_SORT_TOOLTIP_OFFSET - HEADER_PADDING;

    const left = ((column.width * column.index) - tableScrollX)
        + (isLeftAligned ? HEADER_PADDING : (column.width - HEADER_PADDING))
        + offsetLeft;
    return {
        left: `${clamp(left, min, max)}px`
    };
}

// y has always offset
const getPoints = (x, y = -HEADER_PADDING) => ({ x, y });

export function getTooltipSortAlignPoints(columnAlign) {
    const isLeftAligned = columnAlign === ALIGN_LEFT;
    // last align point is used when header cell is not fully visible (scroll)

    // TODO Known issue - wrong tooltip alignment when
    // distance between table left side and window is more than cca 20px,
    // header cell is not fully visible (is scrolled)
    const alignPoints = isLeftAligned ? [
        { align: 'bl tl', offset: getPoints(HEADER_PADDING) },
        { align: 'bl tc', offset: getPoints(HEADER_PADDING) },
        { align: 'bl tr', offset: getPoints(HEADER_PADDING) },
        { align: 'br tl', offset: getPoints(-HEADER_PADDING) },
        { align: 'tl bl', offset: getPoints(HEADER_PADDING, HEADER_PADDING) },
        { align: 'tl bc', offset: getPoints(HEADER_PADDING, HEADER_PADDING) },
        { align: 'tl br', offset: getPoints(HEADER_PADDING, HEADER_PADDING) },
        { align: 'tr bl', offset: getPoints(-HEADER_PADDING, HEADER_PADDING) }
    ] : [
        { align: 'br tr', offset: getPoints(-HEADER_PADDING) },
        { align: 'br tc', offset: getPoints(-HEADER_PADDING) },
        { align: 'br tl', offset: getPoints(-HEADER_PADDING) },
        { align: 'bl tr', offset: getPoints(HEADER_PADDING) },
        { align: 'tr br', offset: getPoints(-HEADER_PADDING, HEADER_PADDING) },
        { align: 'tr bc', offset: getPoints(-HEADER_PADDING, HEADER_PADDING) },
        { align: 'tr bl', offset: getPoints(-HEADER_PADDING, HEADER_PADDING) },
        { align: 'tl br', offset: getPoints(HEADER_PADDING, HEADER_PADDING) }
    ];
    return alignPoints;
}

export const getTooltipAlignPoints = (columnAlign) => {
    return columnAlign === ALIGN_LEFT ? [
        { align: 'bl tl', offset: getPoints(HEADER_PADDING, 0) },
        { align: 'bl tc', offset: getPoints(HEADER_PADDING, 0) },
        { align: 'bl tr', offset: getPoints(HEADER_PADDING, 0) }
    ] : [
        { align: 'br tr', offset: getPoints(-HEADER_PADDING, 0) },
        { align: 'br tc', offset: getPoints(-HEADER_PADDING, 0) },
        { align: 'br tl', offset: getPoints(-HEADER_PADDING, 0) }

    ];
};

export function getCellClassNames(rowIndex, columnKey, drillable) {
    return cx({
        'gd-cell-drillable': drillable
    }, `s-cell-${rowIndex}-${columnKey}`);
}

export function getHeaderClassNames(column) {
    return cx('gd-table-header-ordering', getCssClass(column.id, 's-id-'));
}

export function getStyledLabel(column, content) {
    if (column.type !== 'metric') {
        return { style: {}, label: content.name };
    }

    const { label, color } = colors2Object(
        numberFormat(content === null ? '' : content, column.format)
    );

    const style = color ? { color } : {};

    return { style, label };
}

export function getHeaderSortClassName(sortDir, currentSort) {
    return cx({
        'gd-table-arrow-up': sortDir === ASC,
        'gd-table-arrow-down': sortDir === DESC,
        's-sorted-asc': currentSort === ASC,
        's-sorted-desc': currentSort === DESC
    });
}

export function getNextSortDir(column, currentSortDir) {
    if (!currentSortDir) {
        return column.type === 'metric' ? DESC : ASC;
    }
    return currentSortDir === ASC ? DESC : ASC;
}

export const enrichTableDataHeaders = (columns, afm) =>
    columns.map((column) => {
        if (column.type === 'metric') {
            return assign(column, getMeasureHeader(column, afm));
        } else if (column.type === 'attrLabel') {
            return assign(column, getAttributeHeader(column));
        }
        return column;
    });

export function setPosition(element, position = 'absolute', top = 0, sticking = false) {
    const { style, classList } = element;

    classList[sticking ? 'add' : 'remove']('sticking');
    style.position = position;
    style.top = `${Math.round(top)}px`;
}

export function updatePosition(element, isDefaultPosition, isEdgePosition, positions, stopped) {
    const { defaultTop, edgeTop, fixedTop, absoluteTop } = positions;

    if (isDefaultPosition) {
        setPosition(element, 'absolute', defaultTop);
        return;
    }

    if (isEdgePosition) {
        setPosition(element, 'absolute', edgeTop, true);
        return;
    }

    if (stopped) {
        setPosition(element, 'absolute', absoluteTop, true);
    } else {
        setPosition(element, 'fixed', fixedTop, true);
    }
}

export function getFooterHeight(aggregations) {
    return aggregations.length * DEFAULT_FOOTER_ROW_HEIGHT;
}

export function getHiddenRowsOffset(hasHiddenRows) {
    return hasHiddenRows ? (0.5 * DEFAULT_ROW_HEIGHT) : 0;
}

export function getHeaderOffset(hasHiddenRows) {
    return DEFAULT_HEADER_HEIGHT + ((hasHiddenRows ? 1.5 : 1) * DEFAULT_ROW_HEIGHT);
}

export function getIsHeaderAtDefaultPosition(stickyHeader, tableTop) {
    return tableTop >= stickyHeader;
}

export function getIsHeaderAtEdgePosition(stickyHeader, hasHiddenRows, aggregations, tableBottom) {
    const footerHeight = getFooterHeight(aggregations);
    const hiddenRowsOffset = getHiddenRowsOffset(hasHiddenRows);
    const headerOffset = getHeaderOffset(hasHiddenRows);

    return tableBottom >= stickyHeader &&
        tableBottom < stickyHeader + headerOffset + footerHeight + hiddenRowsOffset;
}

export function getHeaderPositions(stickyHeader, hasHiddenRows, aggregations, tableHeight, tableTop) {
    const footerHeight = getFooterHeight(aggregations);
    const hiddenRowsOffset = getHiddenRowsOffset(hasHiddenRows);
    const headerOffset = getHeaderOffset(hasHiddenRows);

    return {
        defaultTop: 0,
        edgeTop: tableHeight - headerOffset - footerHeight - hiddenRowsOffset,
        fixedTop: stickyHeader,
        absoluteTop: stickyHeader - tableTop
    };
}

export function getIsFooterAtDefaultPosition(aggregations, hasHiddenRows, tableBottom, windowHeight) {
    const hiddenRowsOffset = getHiddenRowsOffset(hasHiddenRows);

    return tableBottom - hiddenRowsOffset <= windowHeight;
}

export function getIsFooterAtEdgePosition(hasHiddenRows, aggregations, tableHeight, tableBottom, windowHeight) {
    const footerHeight = getFooterHeight(aggregations);
    const headerOffset = getHeaderOffset(hasHiddenRows);

    const footerHeightTranslate = tableHeight - footerHeight;

    return tableBottom + headerOffset >= windowHeight + footerHeightTranslate;
}

export function getFooterPositions(hasHiddenRows, aggregations, tableHeight, tableBottom, windowHeight) {
    const footerHeight = getFooterHeight(aggregations);
    const hiddenRowsOffset = getHiddenRowsOffset(hasHiddenRows);
    const headerOffset = getHeaderOffset(hasHiddenRows);

    const footerHeightTranslate = tableHeight - footerHeight;

    return {
        defaultTop: 0 - hiddenRowsOffset,
        edgeTop: headerOffset - footerHeightTranslate,
        fixedTop: windowHeight - footerHeightTranslate - footerHeight,
        absoluteTop: windowHeight - tableBottom
    };
}

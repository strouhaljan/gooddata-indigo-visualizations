import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { Table, Column, Cell } from 'fixed-data-table-2';
import classNames from 'classnames';
import { noop, partial, uniqueId, debounce, pick, assign } from 'lodash';
import { Observable } from 'rxjs/Rx';
import { numberFormat } from '@gooddata/numberjs';

import Bubble from '@gooddata/goodstrap/lib/Bubble/Bubble';
import BubbleHoverTrigger from '@gooddata/goodstrap/lib/Bubble/BubbleHoverTrigger';
import TableSortBubbleContent from './TableSortBubbleContent';
import { cellClick, isDrillable } from '../utils/drilldownEventing';
import DrillableItem from '../proptypes/DrillableItem';

import {
    getNextSortDir,
    getColumnAlign,
    getStyledLabel,
    getCellClassNames,
    getHeaderClassNames,
    getHeaderSortClassName,
    getTooltipSortAlignPoints,
    getTooltipAlignPoints,
    calculateArrowPositions,
    enrichTableDataHeaders
} from './utils';

const MIN_COLUMN_WIDTH = 100;
export const DEFAULT_ROW_HEIGHT = 30;
export const DEFAULT_HEADER_HEIGHT = 26;
export const DEFAULT_FOOTER_ROW_HEIGHT = 30;

const DEBOUNCE_SCROLL_STOP = 500;
const TOOLTIP_DISPLAY_DELAY = 1000;

export const SCROLL_DEBOUNCE_MILISECONDS = 0;
export const RESIZE_DEBOUNCE_MILISECONDS = 60;

const scrollEvents = [
    {
        name: 'scroll',
        debounce: SCROLL_DEBOUNCE_MILISECONDS
    }, {
        name: 'goodstrap.scrolled',
        debounce: SCROLL_DEBOUNCE_MILISECONDS
    }, {
        name: 'resize',
        debounce: RESIZE_DEBOUNCE_MILISECONDS
    }, {
        name: 'goodstrap.drag',
        debounce: RESIZE_DEBOUNCE_MILISECONDS
    }
];

function subscribeEvents(func, events) {
    return events.map((event) => {
        if (event.debounce > 0) {
            return Observable
                .fromEvent(window, event.name)
                .debounceTime(event.debounce)
                .subscribe(func);
        }

        return Observable
            .fromEvent(window, event.name)
            .subscribe(func);
    });
}

export default class TableVisualization extends Component {
    static propTypes = {
        afm: PropTypes.object,
        aggregations: PropTypes.array,
        drillableItems: PropTypes.arrayOf(PropTypes.shape(DrillableItem)),
        containerWidth: PropTypes.number.isRequired,
        containerHeight: PropTypes.number,
        containerMaxHeight: PropTypes.number,
        hasHiddenRows: PropTypes.bool,
        rows: PropTypes.array.isRequired,
        headers: PropTypes.array.isRequired,
        sortInTooltip: PropTypes.bool,
        sortDir: PropTypes.string,
        sortBy: PropTypes.number,
        onSortChange: PropTypes.func,
        stickyHeader: PropTypes.number,
        afterRender: PropTypes.func
    };

    static defaultProps = {
        afm: {},
        aggregations: [],
        drillableItems: [],
        rows: [],
        headers: [],
        onSortChange: noop,
        sortInTooltip: false,
        stickyHeader: -1,
        containerHeight: null,
        containerMaxHeight: null,
        hasHiddenRows: false,
        sortDir: null,
        sortBy: null,
        afterRender: () => {}
    };

    constructor(props) {
        super(props);
        this.state = {
            hintSortBy: null,
            sortBubble: {
                visible: false
            },
            width: 0,
            height: 0
        };

        this.renderTooltipHeader = this.renderTooltipHeader.bind(this);
        this.renderDefaultHeader = this.renderDefaultHeader.bind(this);
        this.setTableRef = this.setTableRef.bind(this);
        this.setTableWrapRef = this.setTableWrapRef.bind(this);
        this.closeBubble = this.closeBubble.bind(this);
        this.scrolled = this.scrolled.bind(this);

        this.stopped = debounce(() => {
            this.scrollHeader(true);
            this.scrollFooter(true);
        }, DEBOUNCE_SCROLL_STOP);
    }

    componentDidMount() {
        const { stickyHeader, aggregations } = this.props;

        this.table = ReactDOM.findDOMNode(this.tableRef); // eslint-disable-line react/no-find-dom-node
        this.tableInnerContainer = this.table.querySelector('.fixedDataTableLayout_rowsContainer');

        const tableRows = this.table.querySelectorAll('.fixedDataTableRowLayout_rowWrapper');

        this.header = tableRows[0];
        this.header.classList.add('table-header');

        if (aggregations.length > 0) {
            this.footer = tableRows[tableRows.length - 1];
            this.footer.classList.add('table-footer');
        }

        if (this.isSticky(stickyHeader)) {
            this.setListeners();
            this.scrolled();
            this.checkTableDimensions();
        }
    }

    componentWillReceiveProps(nextProps) {
        const current = this.props;
        const currentIsSticky = this.isSticky(current.stickyHeader);
        const nextIsSticky = this.isSticky(nextProps.stickyHeader);

        if (currentIsSticky !== nextIsSticky) {
            if (currentIsSticky) {
                this.unsetListeners();
            }
            if (nextIsSticky) {
                this.setListeners();
            }
        }
    }

    componentDidUpdate(prevProps) {
        const { stickyHeader, aggregations } = this.props;

        if (this.isSticky(stickyHeader)) {
            this.scrollHeader(true);
            this.scrollFooter(true);
            this.checkTableDimensions();
        }

        if (prevProps.aggregations !== aggregations) {
            const tableRows = this.table.querySelectorAll('.fixedDataTableRowLayout_rowWrapper');
            this.footer.classList.remove('table-footer');
            this.footer = tableRows[tableRows.length - 1];
            this.footer.classList.add('table-footer');
        }

        console.log('XX componentDidUpdate() props', this.props);

        this.props.afterRender();
    }

    componentWillUnmount() {
        this.unsetListeners();
    }

    setTableRef(ref) {
        this.tableRef = ref;
    }

    setTableWrapRef(ref) {
        this.tableWrapRef = ref;
    }

    setListeners() {
        this.subscribers = subscribeEvents(this.scrolled, scrollEvents);
    }

    setHeading(element, position = '', x = 0, y = 0) {
        const { style, classList } = element;

        classList[position ? 'add' : 'remove']('sticking');
        style.position = position;
        style.left = `${Math.round(x)}px`;
        style.top = `${Math.round(y)}px`;
    }

    getSortFunc(column, index) {
        const { onSortChange } = this.props;
        return partial(onSortChange, column, index);
    }

    getSortObj(column, index) {
        const { sortBy, sortDir } = this.props;
        const { hintSortBy } = this.state;

        const dir = (sortBy === index ? sortDir : null);
        const nextDir = getNextSortDir(column, dir);

        return {
            dir,
            nextDir,
            sortDirClass: getHeaderSortClassName(hintSortBy === index ? nextDir : dir)
        };
    }

    getMouseOverFunc(index) {
        return () => {
            // workaround glitch with fixed-data-table-2,
            // where header styles are overwritten first time user mouses over it
            this.scrolled();

            this.setState({ hintSortBy: index });
        };
    }

    unsetListeners() {
        if (this.subscribers && this.subscribers.length > 0) {
            this.subscribers.forEach((subscriber) => {
                subscriber.unsubscribe();
            });
            this.subscribers = null;
        }
    }

    isSticky(stickyHeader) {
        return stickyHeader >= 0;
    }

    checkTableDimensions() {
        if (this.table) {
            const { width, height } = this.state;
            const rect = this.table.getBoundingClientRect();

            if (width !== rect.width || height !== rect.height) {
                this.setState(pick(rect, 'width', 'height'));
            }
        }
    }

    scrollHeader(stopped = false) {
        const { stickyHeader, sortInTooltip, hasHiddenRows, aggregations } = this.props;
        const boundingRect = this.tableInnerContainer.getBoundingClientRect();

        if (!stopped && sortInTooltip && this.state.sortBubble.visible) {
            this.closeBubble();
        }

        if (
            boundingRect.top >= stickyHeader ||
            boundingRect.top < stickyHeader - boundingRect.height
        ) {
            this.setHeading(this.header);
            return;
        }

        const hiddenRowsOffset = hasHiddenRows ? 0 - (0.5 * DEFAULT_ROW_HEIGHT) : 0;
        const headerOffset = DEFAULT_HEADER_HEIGHT + ((hasHiddenRows ? 1.5 : 1) * DEFAULT_ROW_HEIGHT) + (aggregations.length * DEFAULT_FOOTER_ROW_HEIGHT) - hiddenRowsOffset;

        if (
            boundingRect.bottom >= stickyHeader &&
            boundingRect.bottom < stickyHeader + headerOffset
        ) {
            this.setHeading(this.header, 'absolute', 0, boundingRect.height - headerOffset);
            return;
        }

        if (stopped) {
            this.setHeading(this.header, 'absolute', 0, stickyHeader - boundingRect.top);
        } else {
            this.setHeading(this.header, 'fixed', boundingRect.left, stickyHeader);
        }
    }

    scrollFooter(stopped = false) {
        const { hasHiddenRows, aggregations } = this.props;

        if (aggregations.length === 0) {
            return;
        }

        const boundingRect = this.tableInnerContainer.getBoundingClientRect();
        const hiddenRowsOffset = hasHiddenRows ? 0 - (0.5 * DEFAULT_ROW_HEIGHT) : 0;

        if (boundingRect.bottom + hiddenRowsOffset <= window.innerHeight) {
            this.setHeading(this.footer, null, null, hiddenRowsOffset);
            return;
        }

        const footerHeight = aggregations.length * DEFAULT_FOOTER_ROW_HEIGHT;

        const headerOffset = DEFAULT_HEADER_HEIGHT + ((hasHiddenRows ? 1.5 : 1) * DEFAULT_ROW_HEIGHT);

        const footerHeightTranslate = boundingRect.height - footerHeight;

        if ((boundingRect.bottom - footerHeightTranslate + headerOffset) >= window.innerHeight) {
            this.setHeading(this.footer, 'absolute', 0, headerOffset - footerHeightTranslate);
            return;
        }

        if (stopped) {
            this.setHeading(this.footer, 'absolute', 0, window.innerHeight - boundingRect.bottom);
        } else {
            this.setHeading(this.footer, 'fixed', boundingRect.left, window.innerHeight - footerHeightTranslate - footerHeight);
        }
    }

    // onScroll(stopped = false) {

    // }

    scrolled() {
        this.scrollHeader();
        this.scrollFooter();

        // required for Edge/IE to make sticky header clickable
        this.stopped();
    }

    closeBubble() {
        this.setState({
            sortBubble: {
                visible: false
            }
        });
    }

    isBubbleVisible(index) {
        const { sortBubble } = this.state;
        return sortBubble.visible && sortBubble.index === index;
    }

    renderTooltipHeader(column, index, columnWidth) {
        const headerClasses = getHeaderClassNames(column);
        const bubbleClass = uniqueId('table-header-');
        const cellClasses = classNames(headerClasses, bubbleClass);

        const sort = this.getSortObj(column, index);

        const columnAlign = getColumnAlign(column);
        const sortingModalAlignPoints = getTooltipSortAlignPoints(columnAlign);

        const getArrowPositions = () => {
            return calculateArrowPositions({
                width: columnWidth,
                align: columnAlign,
                index
            }, this.tableRef.state.scrollX, this.tableWrapRef);
        };

        const showSortBubble = () => {
            // workaround glitch with fixed-data-table-2
            // where header styles are overwritten first time user clicks on it
            this.scrolled();

            this.setState({
                sortBubble: {
                    visible: true,
                    index
                }
            });
        };

        return props => (
            <span>
                <Cell {...props} className={cellClasses} onClick={showSortBubble}>
                    <span className="gd-table-header-title">
                        {column.title}
                    </span>
                    <span className={sort.sortDirClass} />
                </Cell>
                {this.isBubbleVisible(index) &&
                    <Bubble
                        closeOnOutsideClick
                        alignTo={`.${bubbleClass}`}
                        className="gd-table-header-bubble bubble-light"
                        overlayClassName="gd-table-header-bubble-overlay"
                        alignPoints={sortingModalAlignPoints}
                        arrowDirections={{
                            'bl tr': 'top',
                            'br tl': 'top',
                            'tl br': 'bottom',
                            'tr bl': 'bottom'
                        }}
                        arrowOffsets={{
                            'bl tr': [14, 10],
                            'br tl': [-14, 10],
                            'tl br': [14, -10],
                            'tr bl': [-14, -10]
                        }}
                        arrowStyle={getArrowPositions}
                        onClose={this.closeBubble}
                    >
                        <TableSortBubbleContent
                            activeSortDir={sort.dir}
                            title={column.title}
                            onClose={this.closeBubble}
                            onSortChange={this.getSortFunc(column, index)}
                        />
                    </Bubble>
                }
            </span>
        );
    }

    renderDefaultHeader(column, index) {
        const headerClasses = getHeaderClassNames(column);

        const sort = this.getSortObj(column, index);
        const sortFunc = this.getSortFunc(column, index);

        const onClick = e => sortFunc(sort.nextDir, e);
        const onMouseEnter = this.getMouseOverFunc(index);
        const onMouseLeave = this.getMouseOverFunc(null);

        const columnAlign = getColumnAlign(column);
        const tooltipAlignPoints = getTooltipAlignPoints(columnAlign);

        return props => (
            <Cell
                {...props}
                className={headerClasses}
                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <BubbleHoverTrigger
                    className="gd-table-header-title"
                    showDelay={TOOLTIP_DISPLAY_DELAY}
                >
                    {column.title}
                    <Bubble
                        closeOnOutsideClick
                        className="bubble-light"
                        overlayClassName="gd-table-header-bubble-overlay"
                        alignPoints={tooltipAlignPoints}
                    >
                        {column.title}
                    </Bubble>
                </BubbleHoverTrigger>

                <span className={sort.sortDirClass} />
            </Cell>
        );
    }

    renderCell(columns, index) {
        const { rows, afm, drillableItems } = this.props;

        const column = columns[index];

        const drillable = isDrillable(drillableItems, column);

        return (cellProps) => {
            const { rowIndex, columnKey } = cellProps;

            const row = rows[rowIndex];
            const content = row[columnKey];
            const classes = getCellClassNames(rowIndex, columnKey, drillable);

            const { style, label } = getStyledLabel(column, content);

            const cellPropsDrill = drillable ? assign({}, cellProps, {
                onClick(e) {
                    cellClick(
                        afm,
                        {
                            columnIndex: columnKey,
                            rowIndex,
                            row,
                            intersection: [column]
                        },
                        e.target
                    );
                }
            }) : cellProps;


            return (
                <Cell {...cellPropsDrill}>
                    <span className={classes} style={style} title={label}>{label}</span>
                </Cell>
            );
        };
    }

    renderAggregations(column, index) {
        const { aggregations } = this.props;

        const style = {
            height: DEFAULT_FOOTER_ROW_HEIGHT
        };
        const isFirstColumn = (index === 0);

        return (
            <Cell>
                {aggregations.map((aggregation) => {
                    const value = aggregation.values[index] === null ? '' : aggregation.values[index];
                    return (
                        <div className={'indigo-table-aggregations-cell'} style={style}>
                            <span>{isFirstColumn ? aggregation.name : numberFormat(value, column.format)}</span>
                        </div>
                    );
                })}
            </Cell>
        );
    }

    renderColumns(columns, columnWidth) {
        const renderHeader =
            this.props.sortInTooltip ? this.renderTooltipHeader : this.renderDefaultHeader;

        return columns.map((column, index) => {
            return (
                <Column
                    key={`${index}.${column.id}`} // eslint-disable-line react/no-array-index-key
                    width={columnWidth}
                    align={getColumnAlign(column)}
                    columnKey={index}
                    header={renderHeader(column, index, columnWidth)}
                    footer={this.renderAggregations(column, index)}
                    cell={this.renderCell(columns, index)}
                    allowCellsRecycling
                />
            );
        });
    }

    getComponentClasses() {
        const { hasHiddenRows, aggregations } = this.props;

        return classNames(
            'indigo-table-component',
            {
                'has-hidden-rows': hasHiddenRows,
                'has-footer': aggregations.length > 0
            });
    }

    getContentClasses() {
        const { isSticky } = this.props;

        return classNames(
            'indigo-table-component-content',
            {
                'has-sticky-header': isSticky
            });
    }

    render() {
        const {
            headers,
            containerWidth,
            containerHeight,
            containerMaxHeight,
            stickyHeader,
            afm,
            aggregations
        } = this.props;

        const enrichedHeaders = enrichTableDataHeaders(headers, afm);

        const columnWidth = Math.max(containerWidth / enrichedHeaders.length, MIN_COLUMN_WIDTH);
        const isSticky = this.isSticky(stickyHeader);

        const footerHeight = DEFAULT_FOOTER_ROW_HEIGHT * aggregations.length;
        const height = containerMaxHeight ? undefined : containerHeight + footerHeight;

        return (
            <div className={this.getComponentClasses()}>
                <div className={this.getContentClasses()} ref={this.setTableWrapRef}>
                    <Table
                        ref={this.setTableRef}
                        touchScrollEnabled
                        headerHeight={DEFAULT_HEADER_HEIGHT}
                        footerHeight={footerHeight}
                        rowHeight={DEFAULT_ROW_HEIGHT}
                        rowsCount={this.props.rows.length}
                        width={containerWidth}
                        maxHeight={containerMaxHeight + footerHeight}
                        height={height}
                        onScrollStart={this.closeBubble}
                    >
                        {this.renderColumns(enrichedHeaders, columnWidth)}
                    </Table>
                </div>
                {isSticky ? (
                    <div
                        className="indigo-table-background-filler"
                        style={{ ...pick(this.state, 'width', 'height') }}
                    />
                ) : false}
            </div>
        );
    }
}

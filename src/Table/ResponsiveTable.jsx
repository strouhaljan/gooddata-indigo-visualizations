import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindAll, noop } from 'lodash';
import { DEFAULT_HEADER_HEIGHT, DEFAULT_ROW_HEIGHT, DEFAULT_FOOTER_ROW_HEIGHT } from './TableVisualization';
import Table from './Table';
import TableControls from './TableControls';

export const HEIGHT_PADDING = 20;

const isTouchDevice = 'ontouchstart' in document.documentElement;

export default class ResponsiveTable extends Component {
    static propTypes = {
        aggregations: PropTypes.array,
        rowsPerPage: PropTypes.number.isRequired,
        rows: PropTypes.array.isRequired,
        page: PropTypes.number,
        onMore: PropTypes.func,
        onLess: PropTypes.func
    };

    static defaultProps = {
        aggregations: [],
        onMore: noop,
        onLess: noop,
        page: 1
    };

    constructor(props, ...args) {
        super(props, ...args);

        this.state = {
            page: props.page || 1
        };

        bindAll(this, ['onMore', 'onLess', 'setTableRef']);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.page) {
            this.setState({
                page: nextProps.page
            });
        }
    }

    onMore() {
        const page = this.state.page + 1;

        this.setState({ page });

        this.props.onMore({ page, rows: this.getRowCount(page) });
    }

    onLess() {
        this.setState({ page: 1 });

        this.props.onLess({ rows: this.getRowCount(1) });

        const header = this.table.getBoundingClientRect();
        window.scrollTo(window.pageXOffset, window.pageYOffset + header.top);
    }

    getRowCount(page) {
        return Math.min(this.props.rows.length, this.props.rowsPerPage * page);
    }

    getContainerMaxHeight() {
        const { rows, aggregations } = this.props;

        return (rows.length * DEFAULT_ROW_HEIGHT) +
            (aggregations.length * DEFAULT_FOOTER_ROW_HEIGHT) +
            DEFAULT_HEADER_HEIGHT + HEIGHT_PADDING;
    }

    setTableRef(table) {
        this.table = table;
    }

    isMoreButtonVisible() {
        return this.props.rows.length > this.props.rowsPerPage;
    }

    isMoreButtonDisabled() {
        return this.props.rows.length <= this.props.rowsPerPage * this.state.page;
    }

    isLessButtonVisible() {
        return this.state.page > 1;
    }

    render() {
        const props = this.props;

        const newProps = {
            ...props,
            rows: props.rows.slice(0, this.getRowCount(this.state.page)),
            containerHeight: 0,
            containerMaxHeight: this.getContainerMaxHeight(),
            hasHiddenRows: !this.isMoreButtonDisabled(),
            sortInTooltip: isTouchDevice
        };

        return (
            <div className="gdc-indigo-responsive-table" ref={this.setTableRef}>
                <Table {...newProps} />
                <TableControls
                    {...props}
                    onMore={this.onMore}
                    onLess={this.onLess}
                    isMoreButtonDisabled={this.isMoreButtonDisabled()}
                    isMoreButtonVisible={this.isMoreButtonVisible()}
                    isLessButtonVisible={this.isLessButtonVisible()}
                />
            </div>
        );
    }
}

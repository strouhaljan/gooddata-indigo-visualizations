import React from 'react';
import { mount } from 'enzyme';
import { Table } from 'fixed-data-table-2';
import { fill } from 'lodash';

import TableVisualization, { updatePosition, getDimensionsForCalculation } from '../TableVisualization';
import { ASC, DESC } from '../Sort';
import { withIntl } from '../../test/utils';

const FIXTURE = {
    headers: [
        {
            type: 'attrLabel',
            title: 'Name'
        }, {
            id: 'metric-1',
            type: 'metric',
            title: '# of Open Opps.',
            format: '#,##0'
        }, {
            id: 'metric-2',
            type: 'metric',
            title: '# of Opportunities',
            format: '[red]#,##0'
        }
    ],
    rawData: [
        [{ id: '1', name: 'Wile E. Coyote' }, '30', '1324']
    ],
    afm: {
        measures: [
            {
                definition: {
                    baseObject: { id: 'metric-1-uri' }
                },
                id: 'metric-1'
            }
        ]
    },
    aggregations: [
        {
            name: 'Sum',
            values: [null, null, 125]
        }, {
            name: 'Avg',
            values: [null, 45.98, 12.32]
        }, {
            name: 'Rollup',
            values: [null, 12.99, 1.008]
        }
    ]
};

const WrappedTable = withIntl(TableVisualization);

describe('Table', () => {
    function renderTable(customProps = {}) {
        const props = {
            containerWidth: 600,
            containerHeight: 400,
            rows: FIXTURE.rawData,
            headers: FIXTURE.headers,
            afm: FIXTURE.afm,
            ...customProps
        };

        return mount(
            <WrappedTable {...props} />
        );
    }

    it('should fit container dimensions', () => {
        const wrapper = renderTable();
        expect(wrapper.find(Table).prop('width')).toEqual(600);
        expect(wrapper.find(Table).prop('height')).toEqual(400);
    });

    it('should render column headers', () => {
        const wrapper = renderTable();
        expect(wrapper.find(Table).prop('children')).toHaveLength(3);
    });

    it('should align metric columns to the right', () => {
        const wrapper = renderTable();
        const columns = wrapper.find(Table).prop('children');
        expect(columns[0].props.align).toEqual('left');
        expect(columns[1].props.align).toEqual('right');
        expect(columns[2].props.align).toEqual('right');
    });

    it('should distribute width evenly between columns', () => {
        const wrapper = renderTable();
        const columns = wrapper.find(Table).prop('children');
        expect(columns[0].props.width).toEqual(200);
    });

    describe('renderers', () => {
        function renderCell(wrapper, columnKey) {
            const columns = wrapper.find(Table).prop('children');
            const cell = columns[columnKey].props.cell({ rowIndex: 0, columnKey });
            const span = cell.props.children;
            return span;
        }

        it('should format metrics', () => {
            const wrapper = renderTable();
            const span = renderCell(wrapper, 2);
            const spanContent = span.props.children;
            expect(spanContent).toEqual('1,324');
            expect(span.props.style.color).toEqual('#FF0000');
        });

        it('should render attributes as strings', () => {
            const wrapper = renderTable();
            const span = renderCell(wrapper, 0);
            const spanContent = span.props.children;
            expect(spanContent).toEqual('Wile E. Coyote');
            expect(span.props.style).toEqual({});
        });

        it('should render title into header', () => {
            const wrapper = renderTable();
            expect(wrapper.find('.gd-table-header-title').first().text()).toEqual('Name');
        });

        it('should bind onclick when cell drillable', () => {
            const wrapper = renderTable({ drillableItems: [{ uri: 'metric-1-uri' }] });
            const columns = wrapper.find(Table).prop('children');
            const cell = columns[1].props.cell({ rowIndex: 0, columnKey: 1 });

            expect(cell.props).toHaveProperty('onClick', expect.any(Function));
        });

        it('should not bind onclick when cell not drillable', () => {
            const wrapper = renderTable({ drillableItems: [{ uri: 'metric-x-uri' }] });
            const columns = wrapper.find(Table).prop('children');
            const cell = columns[1].props.cell({ rowIndex: 0, columnKey: 1 });

            expect(cell.props).not.toHaveProperty('onClick', expect.any(Function));
        });
    });

    describe('sort', () => {
        describe('default header renderer', () => {
            it('should render up arrow', () => {
                const wrapper = renderTable({ sortBy: 0, sortDir: ASC });
                const columns = wrapper.find(Table).prop('children');
                const header = columns[0].props.header({ columnKey: 0 });
                const sort = header.props.children[1];

                expect(sort.props.className).toContain('gd-table-arrow-up');
                expect(sort.props.className).toContain('s-sorted-asc');
            });

            it('should render down arrow', () => {
                const wrapper = renderTable({ sortBy: 0, sortDir: DESC });
                const columns = wrapper.find(Table).prop('children');
                const header = columns[0].props.header({ columnKey: 0 });
                const sort = header.props.children[1];

                expect(sort.props.className).toContain('gd-table-arrow-down');
                expect(sort.props.className).toContain('s-sorted-desc');
            });

            it('should render arrow on second column', () => {
                const wrapper = renderTable({ sortBy: 1, sortDir: ASC });
                const columns = wrapper.find(Table).prop('children');
                const header = columns[1].props.header({ columnKey: 0 });
                const sort = header.props.children[1];

                expect(sort.props.className).toContain('gd-table-arrow-up');
                expect(sort.props.className).toContain('s-sorted-asc');
            });

            it('should not render arrow if sort info is missing', () => {
                const wrapper = renderTable({ sortBy: 0, sortDir: null });
                const columns = wrapper.find(Table).prop('children');
                const header = columns[0].props.header({ columnKey: 0 });
                const sort = header.props.children[1];

                expect(sort.props.className).toEqual('');
            });
        });

        describe('tooltip header renderer', () => {
            it('should render title into header', () => {
                const wrapper = renderTable({ sortInTooltip: true });

                wrapper.find('.gd-table-header-title').first().simulate('click');

                const bubble = document.querySelector('.gd-table-header-bubble');
                expect(bubble).toBeDefined();

                // work-around to handle overlays
                document.body.innerHTML = '';
            });
        });
    });

    describe('table footer', () => {
        it('should not render any footer cells when no aggregations are provided', () => {
            const wrapper = renderTable();

            expect(wrapper.find('.indigo-table-footer-cell').length).toEqual(0);
        });

        it('should render footer cells when aggregations are provided', () => {
            const wrapper = renderTable({ aggregations: FIXTURE.aggregations });

            expect(wrapper.find('.indigo-table-footer-cell').length).toEqual(9);
        });
    });

    describe('#updatePosition', () => {
        const positions = {
            defaultTop: 1,
            edgeTop: 2,
            fixedTop: 3,
            absoluteTop: 4
        };

        let element;

        beforeEach(() => {
            element = document.createElement('div');
        });

        it('should set default position and proper class to given element', () => {
            const positionConditions = {
                isDefaultPosition: true,
                isEdgePosition: false
            };

            updatePosition(element, positionConditions, positions);

            expect(element.classList.contains('sticking')).toEqual(false);
            expect(element.style.position).toEqual('absolute');
            expect(element.style.top).toEqual(`${positions.defaultTop}px`);
        });

        it('should set edge position and proper class to given element', () => {
            const positionConditions = {
                isDefaultPosition: false,
                isEdgePosition: true
            };

            updatePosition(element, positionConditions, positions);

            expect(element.classList.contains('sticking')).toEqual(true);
            expect(element.style.position).toEqual('absolute');
            expect(element.style.top).toEqual(`${positions.edgeTop}px`);
        });

        it('should set fixed position and proper class to given element', () => {
            const positionConditions = {
                isDefaultPosition: false,
                isEdgePosition: false
            };

            updatePosition(element, positionConditions, positions);

            expect(element.classList.contains('sticking')).toEqual(true);
            expect(element.style.position).toEqual('fixed');
            expect(element.style.top).toEqual(`${positions.fixedTop}px`);
        });

        it('should set absolute position and proper class to given element', () => {
            const positionConditions = {
                isDefaultPosition: false,
                isEdgePosition: false
            };
            const stopped = true;

            updatePosition(element, positionConditions, positions, stopped);

            expect(element.classList.contains('sticking')).toEqual(true);
            expect(element.style.position).toEqual('absolute');
            expect(element.style.top).toEqual(`${positions.absoluteTop}px`);
        });
    });

    describe('#getDimensionsForCalculation', () => {
        it('should return proper dimensions when no aggregations are given', () => {
            const hasHiddenRows = true;
            const aggregationsLength = 0;
            const aggregations = fill(Array(aggregationsLength), true);
            const dimensionsForCalculation = getDimensionsForCalculation(aggregations, hasHiddenRows);

            expect(dimensionsForCalculation).toEqual({
                footerHeight: 0,
                hiddenRowsOffset: 15,
                headerOffset: 71
            });
        });

        it('should return proper dimensions when no aggregations are given and whole table is displayed', () => {
            const hasHiddenRows = false;
            const aggregationsLength = 0;
            const aggregations = fill(Array(aggregationsLength), true);
            const dimensionsForCalculation = getDimensionsForCalculation(aggregations, hasHiddenRows);

            expect(dimensionsForCalculation).toEqual({
                footerHeight: 0,
                hiddenRowsOffset: 0,
                headerOffset: 56
            });
        });

        it('should return proper dimensions when 5 aggregations are given', () => {
            const hasHiddenRows = true;
            const aggregationsLength = 5;
            const aggregations = fill(Array(aggregationsLength), true);
            const dimensionsForCalculation = getDimensionsForCalculation(aggregations, hasHiddenRows);

            expect(dimensionsForCalculation).toEqual({
                footerHeight: 150,
                hiddenRowsOffset: 15,
                headerOffset: 71
            });
        });

        it('should return proper dimensions when 5 aggregations are given and whole table is displayed', () => {
            const hasHiddenRows = false;
            const aggregationsLength = 5;
            const aggregations = fill(Array(aggregationsLength), true);
            const dimensionsForCalculation = getDimensionsForCalculation(aggregations, hasHiddenRows);

            expect(dimensionsForCalculation).toEqual({
                footerHeight: 150,
                hiddenRowsOffset: 0,
                headerOffset: 56
            });
        });
    });
});

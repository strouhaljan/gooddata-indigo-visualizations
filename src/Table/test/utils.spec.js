import {
    getSortInfo,
    getMetricsFromHeaders,
    parseMetricValues,
    updatePosition,
    getFooterHeight,
    getHiddenRowsOffset,
    getHeaderOffset,
    getIsHeaderAtDefaultPosition,
    getIsHeaderAtEdgePosition,
    getHeaderPositions,
    getIsFooterAtDefaultPosition,
    getIsFooterAtEdgePosition,
    getFooterPositions,
    getHeaderSortClassName
} from '../utils';
import { ASC, DESC } from '../Sort';

describe('Utils', () => {
    describe('getSortInfo', () => {
        let config;

        beforeEach(() => {
            config = {
                buckets: {
                    categories: [
                        { category: { } },
                        { category: { sort: 'asc' } }
                    ],
                    measures: [
                        { measure: {} },
                        { measure: { sort: 'desc' } }
                    ]
                }
            };
        });

        it('should get sort for category', () => {
            const sortInfo = getSortInfo(config);

            expect(sortInfo.sortBy).toEqual(1);
            expect(sortInfo.sortDir).toEqual('asc');
        });

        it('should get sort for measure', () => {
            config.buckets.categories[1].category = {};
            const sortInfo = getSortInfo(config);

            expect(sortInfo.sortBy).toEqual(3);
            expect(sortInfo.sortDir).toEqual('desc');
        });

        it('should handle missing config', () => {
            const sortInfo = getSortInfo();

            expect(sortInfo).toEqual({});
        });

        it('should handle missing categories', () => {
            delete config.buckets.categories;
            const sortInfo = getSortInfo(config);

            expect(sortInfo.sortBy).toEqual(1);
            expect(sortInfo.sortDir).toEqual('desc');
        });

        it('should handle sort object in measure', () => {
            const sortInfo = getSortInfo({
                buckets: {
                    categories: [],
                    measures: [
                        { measure: {} },
                        { measure: { sort: { direction: 'asc' } } }
                    ]
                }
            });

            expect(sortInfo.sortBy).toEqual(1);
            expect(sortInfo.sortDir).toEqual('asc');
        });

        it('should handle sort for measure with pop', () => {
            const sortInfo = getSortInfo({
                buckets: {
                    categories: [],
                    measures: [
                        { measure: {} },
                        { measure: { showPoP: true, sort: { direction: 'asc' } } }
                    ]
                }
            });

            expect(sortInfo.sortBy).toEqual(2);
            expect(sortInfo.sortDir).toEqual('asc');
        });

        it('should handle sort for pop measure', () => {
            const sortInfo = getSortInfo({
                buckets: {
                    categories: [],
                    measures: [
                        { measure: {} },
                        { measure: { showPoP: true, sort: { direction: 'asc', sortByPoP: true } } }
                    ]
                }
            });

            expect(sortInfo.sortBy).toEqual(1);
            expect(sortInfo.sortDir).toEqual('asc');
        });
    });

    describe('getHeaderSortClassName', () => {
        it('should create classes with hinted ASC and current sort DESC', () => {
            const classes = getHeaderSortClassName(ASC, DESC);
            expect(classes).toContain('gd-table-arrow-up');
            expect(classes).toContain('s-sorted-desc');
        });

        it('should create classes with hinted sort and without current sort', () => {
            const classes = getHeaderSortClassName(DESC, null);
            expect(classes).toContain('gd-table-arrow-down');
            expect(classes).not.toContain('s-sorted-desc');
            expect(classes).not.toContain('s-sorted-asc');
        });
    });

    describe('getMetricsFromHeaders', () => {
        it('should create array of metrics from headers with only one metric', () => {
            const headers = [
                {
                    type: 'metric',
                    data: {}
                },
                {
                    type: 'other',
                    data: {}
                }
            ];

            const metrics = getMetricsFromHeaders(headers);

            expect(metrics.length).toEqual(1);
        });

        it('should create array of 2 metrics from headers with correct metric index', () => {
            const headers = [
                {
                    type: 'metric',
                    data: {}
                },
                {
                    type: 'other',
                    data: {}
                },
                {
                    type: 'metric',
                    data: {}
                }
            ];

            const metrics = getMetricsFromHeaders(headers);

            expect(metrics).toEqual([
                {
                    index: 0,
                    header: {
                        type: 'metric',
                        data: {}
                    }
                },
                {
                    index: 2,
                    header: {
                        type: 'metric',
                        data: {}
                    }
                }
            ]);
        });
    });

    describe('parseMetricValues', () => {
        it('should parse metric values in given data', () => {
            const headers = [
                {
                    type: 'metric',
                    data: {}
                },
                {
                    type: 'other',
                    data: {}
                },
                {
                    type: 'metric',
                    data: {}
                }
            ];

            const rawData = [
                ['12345', 'test', '98765'],
                ['1.2345', 'test', '9.8765'],
                ['1.2345678901e-05', 'test', '9.8765432109e-3']
            ];

            const data = parseMetricValues(headers, rawData);

            expect(data).toEqual([
                [12345, 'test', 98765],
                [1.2345, 'test', 9.8765],
                [0.000012345678901, 'test', 0.0098765432109]
            ]);
        });
    });

    describe('updatePosition', () => {
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
            const isDefaultPosition = true;
            const isEdgePosition = false;

            updatePosition(element, isDefaultPosition, isEdgePosition, positions);

            expect(element.classList.contains('sticking')).toEqual(false);
            expect(element.style.position).toEqual('absolute');
            expect(element.style.top).toEqual(`${positions.defaultTop}px`);
        });

        it('should set edge position and proper class to given element', () => {
            const isDefaultPosition = false;
            const isEdgePosition = true;

            updatePosition(element, isDefaultPosition, isEdgePosition, positions);

            expect(element.classList.contains('sticking')).toEqual(true);
            expect(element.style.position).toEqual('absolute');
            expect(element.style.top).toEqual(`${positions.edgeTop}px`);
        });

        it('should set fixed position and proper class to given element', () => {
            const isDefaultPosition = false;
            const isEdgePosition = false;

            updatePosition(element, isDefaultPosition, isEdgePosition, positions);

            expect(element.classList.contains('sticking')).toEqual(true);
            expect(element.style.position).toEqual('fixed');
            expect(element.style.top).toEqual(`${positions.fixedTop}px`);
        });

        it('should set absolute position and proper class to given element', () => {
            const isDefaultPosition = false;
            const isEdgePosition = false;
            const stopped = true;

            updatePosition(element, isDefaultPosition, isEdgePosition, positions, stopped);

            expect(element.classList.contains('sticking')).toEqual(true);
            expect(element.style.position).toEqual('absolute');
            expect(element.style.top).toEqual(`${positions.absoluteTop}px`);
        });
    });

    describe('getFooterHeight', () => {
        it('should return proper height', () => {
            const aggregations = [1, 2];
            expect(getFooterHeight(aggregations)).toEqual(60);
        });

        it('should return zero height when no aggregations are given', () => {
            const aggregations = [];
            expect(getFooterHeight(aggregations)).toEqual(0);
        });
    });

    describe('getHiddenRowsOffset', () => {
        it('should return proper hidden rows offset', () => {
            const hasHiddenRows = true;
            expect(getHiddenRowsOffset(hasHiddenRows)).toEqual(15);
        });

        it('should return zero hidden rows offset when table has no hidden rows', () => {
            const hasHiddenRows = false;
            expect(getHiddenRowsOffset(hasHiddenRows)).toEqual(0);
        });
    });

    describe('getHeaderOffset', () => {
        it('should return proper header offset', () => {
            const hasHiddenRows = true;
            expect(getHeaderOffset(hasHiddenRows)).toEqual(71);
        });

        it('should return zero header offset when table has no hidden rows', () => {
            const hasHiddenRows = false;
            expect(getHeaderOffset(hasHiddenRows)).toEqual(56);
        });
    });

    describe('getIsHeaderAtDefaultPosition', () => {
        it('should return true if header is at its default position', () => {
            const stickyHeader = 0;
            const tableTop = 10;
            expect(getIsHeaderAtDefaultPosition(stickyHeader, tableTop)).toEqual(true);
        });

        it('should return false if header is not at its default position', () => {
            const stickyHeader = 0;
            const tableTop = -10;
            expect(getIsHeaderAtDefaultPosition(stickyHeader, tableTop)).toEqual(false);
        });
    });

    describe('getIsHeaderAtEdgePosition', () => {
        const stickyHeader = 0;
        const hasHiddenRows = true;
        const aggregations = [];

        it('should return true if header is at its edge position', () => {
            const tableBottom = 50;
            expect(getIsHeaderAtEdgePosition(stickyHeader, hasHiddenRows, aggregations, tableBottom)).toEqual(true);
        });

        it('should return false if header is not at its edge position', () => {
            const tableBottom = 500;
            expect(getIsHeaderAtEdgePosition(stickyHeader, hasHiddenRows, aggregations, tableBottom)).toEqual(false);
        });
    });

    describe('getHeaderPositions', () => {
        it('should return proper header positions', () => {
            let stickyHeader = 0;
            let hasHiddenRows = true;
            let aggregations = [];
            let tableHeight = 500;
            let tableTop = 50;

            let expected = {
                defaultTop: 0,
                edgeTop: 414,
                fixedTop: 0,
                absoluteTop: -50
            };

            expect(getHeaderPositions(stickyHeader, hasHiddenRows, aggregations, tableHeight, tableTop))
                .toEqual(expected);

            stickyHeader = 0;
            hasHiddenRows = true;
            aggregations = [1, 2, 3];
            tableHeight = 500;
            tableTop = 50;

            expected = {
                defaultTop: 0,
                edgeTop: 324,
                fixedTop: 0,
                absoluteTop: -50
            };

            expect(getHeaderPositions(stickyHeader, hasHiddenRows, aggregations, tableHeight, tableTop))
                .toEqual(expected);

            stickyHeader = 0;
            hasHiddenRows = false;
            aggregations = [1, 2, 3];
            tableHeight = 500;
            tableTop = 50;

            expected = {
                defaultTop: 0,
                edgeTop: 354,
                fixedTop: 0,
                absoluteTop: -50
            };

            expect(getHeaderPositions(stickyHeader, hasHiddenRows, aggregations, tableHeight, tableTop))
                .toEqual(expected);

            stickyHeader = 0;
            hasHiddenRows = true;
            aggregations = [];
            tableHeight = 200;
            tableTop = 100;

            expected = {
                defaultTop: 0,
                edgeTop: 114,
                fixedTop: 0,
                absoluteTop: -100
            };

            expect(getHeaderPositions(stickyHeader, hasHiddenRows, aggregations, tableHeight, tableTop))
                .toEqual(expected);

            stickyHeader = 0;
            hasHiddenRows = false;
            aggregations = [];
            tableHeight = 200;
            tableTop = 100;

            expected = {
                defaultTop: 0,
                edgeTop: 144,
                fixedTop: 0,
                absoluteTop: -100
            };

            expect(getHeaderPositions(stickyHeader, hasHiddenRows, aggregations, tableHeight, tableTop))
                .toEqual(expected);
        });
    });

    describe('getIsFooterAtDefaultPosition', () => {
        const aggregations = [1, 2, 3];
        const hasHiddenRows = false;
        const windowHeight = 500;

        it('should return true if footer is at its default position', () => {
            const tableBottom = 100;
            expect(getIsFooterAtDefaultPosition(aggregations, hasHiddenRows, tableBottom, windowHeight))
                .toEqual(true);
        });

        it('should return false if footer is not at its default position', () => {
            const tableBottom = 600;
            expect(getIsFooterAtDefaultPosition(aggregations, hasHiddenRows, tableBottom, windowHeight))
                .toEqual(false);
        });
    });

    describe('getIsFooterAtEdgePosition', () => {
        const aggregations = [1, 2, 3];
        const hasHiddenRows = false;
        const tableHeight = 500;
        const windowHeight = 500;

        it('should return true if footer is at its edge position', () => {
            const tableBottom = 1000;
            expect(getIsFooterAtEdgePosition(hasHiddenRows, aggregations, tableHeight, tableBottom, windowHeight))
                .toEqual(true);
        });

        it('should return false if footer is not at its edge position', () => {
            const tableBottom = 100;
            expect(getIsFooterAtEdgePosition(hasHiddenRows, aggregations, tableHeight, tableBottom, windowHeight))
                .toEqual(false);
        });
    });

    describe('getFooterPositions', () => {
        it('should return proper footer positions', () => {
            let hasHiddenRows = true;
            let aggregations = [1, 2, 3];
            let tableHeight = 300;
            let tableBottom = 500;
            let windowHeight = 400;

            let expected = {
                defaultTop: -15,
                edgeTop: -139,
                fixedTop: 100,
                absoluteTop: -100
            };

            expect(getFooterPositions(hasHiddenRows, aggregations, tableHeight, tableBottom, windowHeight))
                .toEqual(expected);

            hasHiddenRows = true;
            aggregations = [1, 2, 3];
            tableHeight = 500;
            tableBottom = 1000;
            windowHeight = 800;

            expected = {
                defaultTop: -15,
                edgeTop: -339,
                fixedTop: 300,
                absoluteTop: -200
            };

            expect(getFooterPositions(hasHiddenRows, aggregations, tableHeight, tableBottom, windowHeight))
                .toEqual(expected);

            hasHiddenRows = false;
            aggregations = [1, 2, 3];
            tableHeight = 300;
            tableBottom = 100;
            windowHeight = 500;

            expected = {
                defaultTop: 0,
                edgeTop: -154,
                fixedTop: 200,
                absoluteTop: 400
            };

            expect(getFooterPositions(hasHiddenRows, aggregations, tableHeight, tableBottom, windowHeight))
                .toEqual(expected);
        });
    });
});

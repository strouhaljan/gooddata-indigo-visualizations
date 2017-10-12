import React from 'react';
import { storiesOf, action } from '@storybook/react';
import { range } from 'lodash';

import TableTransformation from '../src/Table/TableTransformation';
import ResponsiveTable from '../src/Table/ResponsiveTable';
import IntlWrapper from './utils/IntlWrapper';
import { screenshotWrap } from './utils/wrap';

import * as TestConfig from './test_data/test_config';
import * as TestData from './test_data/test_data';
import '../src/styles/table.scss';

function generateData(columns, rows) {
    const headers = range(columns)
        .map((i) => {
            return {
                type: 'attrLabel',
                id: i,
                title: `Column ${i}`
            };
        });
    const rawData = range(rows)
        .map(() => {
            return range(columns).map(i => ({ id: i, name: i }));
        });

    return {
        headers,
        rawData
    };
}

function generateAggregations(columns, aggregationsTypes) {
    return aggregationsTypes.map((type, typeIndex) => {
        return {
            name: type,
            values: range(columns).map((column, columnIndex) => typeIndex + columnIndex)
        };
    });
}

storiesOf('Table')
    .add('Fixed dimensions', () => (
        screenshotWrap(
            <div>
                <TableTransformation
                    config={TestConfig.table}
                    data={TestData.stackedBar}
                    onSortChange={action('Sort changed')}
                    width={600}
                    height={400}
                />
            </div>
        )
    ))
    .add('Fill parent', () => (
        screenshotWrap(
            <div style={{ width: '100%', height: 500 }}>
                <TableTransformation
                    config={TestConfig.table}
                    data={TestData.stackedBar}
                    onSortChange={action('Sort changed')}
                />
            </div>
        )
    ))
    .add('Sticky header', () => (
        screenshotWrap(
            <div style={{ width: '100%', height: 600 }}>
                <TableTransformation
                    config={{
                        ...TestConfig.table,
                        stickyHeader: 0
                    }}
                    data={TestData.stackedBar}
                    height={400}
                />
                <div style={{ height: 800 }} />
            </div>
        )
    ))
    .add('Vertical scroll', () => (
        screenshotWrap(
            <div>
                <TableTransformation
                    config={TestConfig.table}
                    data={generateData(20, 20)}
                    width={600}
                    height={400}
                />
            </div>
        )
    ))
    .add('Show more/Show less', () => (
        screenshotWrap(
            <IntlWrapper>
                <TableTransformation
                    tableRenderer={props => (<ResponsiveTable {...props} />)}
                    config={{
                        ...TestConfig.table,
                        onMore: action('More clicked'),
                        onLess: action('Less clicked')
                    }}
                    data={generateData(20, 20)}
                    height={400}
                />
            </IntlWrapper>
        )
    ))
    .add('Aggregations', () => (
        screenshotWrap(
            <IntlWrapper>
                <TableTransformation
                    aggregations={generateAggregations(3, ['Sum', 'Avg', 'Rollup'])}
                    tableRenderer={props => (<ResponsiveTable {...props} />)}
                    config={{
                        ...TestConfig.table,
                        stickyHeader: 0
                    }}
                    data={TestData.stackedBar}
                    height={400}
                />
            </IntlWrapper>
        )
    ));

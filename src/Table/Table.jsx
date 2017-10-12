import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Measure from 'react-measure';
import TableVisualization from './TableVisualization';

export default class Table extends PureComponent {
    static propTypes = {
        containerHeight: PropTypes.number,
        containerWidth: PropTypes.number
    };

    static defaultProps = {
        containerWidth: null,
        containerHeight: null
    };

    render() {
        const { containerWidth, containerHeight } = this.props;
        return (
            <Measure>
                {dimensions => (
                    <div className="viz-table-wrap" style={{ height: '100%', width: '100%' }}>
                        <TableVisualization
                            {...this.props}
                            aggregations={[
                                {
                                    name: 'sum',
                                    values: [null, null, 125, null, 256, 815, 99, 9876983]
                                }, {
                                    name: 'avg',
                                    values: [null, null, 45.98, 12.32, null, 12, 113, 231]
                                }, {
                                    name: 'rollup',
                                    values: [null, 12.99, null, 1.28, 98.1, 1.008, 2, 2.098765]
                                }
                            ]}
                            containerWidth={containerWidth || dimensions.width}
                            containerHeight={containerHeight || dimensions.height}
                        />
                    </div>
                )}
            </Measure>
        );
    }
}

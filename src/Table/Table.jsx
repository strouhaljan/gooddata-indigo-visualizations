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
                            containerWidth={containerWidth || dimensions.width}
                            containerHeight={containerHeight || dimensions.height}
                        />
                    </div>
                )}
            </Measure>
        );
    }
}

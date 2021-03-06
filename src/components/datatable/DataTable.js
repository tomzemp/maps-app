import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import i18n from '@dhis2/d2-i18n';
import { Table, Column } from 'react-virtualized';
import { isValidUid } from 'd2/uid';
import { debounce } from 'lodash/fp';
import ColumnHeader from './ColumnHeader';
import ColorCell from './ColorCell';
import EarthEngineColumns from './EarthEngineColumns';
import { selectOrgUnit, unselectOrgUnit } from '../../actions/orgUnits';
import { setDataFilter, clearDataFilter } from '../../actions/dataFilters';
import { highlightFeature } from '../../actions/feature';
import { loadLayer } from '../../actions/layers';
import { filterData } from '../../util/filter';
import { formatTime } from '../../util/helpers';
import {
    EVENT_LAYER,
    THEMATIC_LAYER,
    BOUNDARY_LAYER,
    EARTH_ENGINE_LAYER,
} from '../../constants/layers';
import { numberValueTypes } from '../../constants/valueTypes';
import styles from './styles/DataTable.module.css';
import '../../../node_modules/react-virtualized/styles.css';

// Using react component to keep sorting state, which is only used within the data table.
class DataTable extends Component {
    static propTypes = {
        layer: PropTypes.object.isRequired,
        feature: PropTypes.object,
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
        loadLayer: PropTypes.func.isRequired,
        highlightFeature: PropTypes.func.isRequired,
    };

    static defaultProps = {
        data: [],
    };

    constructor(props, context) {
        super(props, context);

        // Default sort
        const sortBy = 'index';
        const sortDirection = 'ASC';

        const data = this.sort(this.filter(), sortBy, sortDirection);

        this.state = {
            sortBy,
            sortDirection,
            data,
        };
    }

    componentDidMount() {
        this.loadExtendedData();
    }

    componentDidUpdate(prevProps) {
        const { data, dataFilters } = this.props.layer;
        const prev = prevProps.layer;

        if (data !== prev.data || dataFilters !== prev.dataFilters) {
            const { sortBy, sortDirection } = this.state;

            this.setState({
                data: this.sort(this.filter(), sortBy, sortDirection),
            });
        }
    }

    loadExtendedData() {
        const { layer, loadLayer } = this.props;
        const { layer: layerType, isExtended, serverCluster } = layer;

        if (layerType === EVENT_LAYER && !isExtended && !serverCluster) {
            loadLayer({
                ...layer,
                showDataTable: true,
            });
        }
    }

    filter() {
        const { data = [], dataFilters } = this.props.layer;

        return filterData(
            data.map((d, i) => ({
                ...d.properties,
                index: i,
            })),
            dataFilters
        );
    }

    // TODO: Make sure sorting works across different locales - use lib method
    sort(data, sortBy, sortDirection) {
        return data.sort((a, b) => {
            a = a[sortBy];
            b = b[sortBy];

            if (typeof a === 'number') {
                return sortDirection === 'ASC' ? a - b : b - a;
            }

            if (a !== undefined) {
                return sortDirection === 'ASC'
                    ? a.localeCompare(b)
                    : b.localeCompare(a);
            }

            return 0;
        });
    }

    onSort(sortBy, sortDirection) {
        const { data } = this.state;

        this.setState({
            sortBy,
            sortDirection,
            data: this.sort(data, sortBy, sortDirection),
        });
    }

    // Return event data items used for styling, filters or "display in reports"
    getEventDataItems() {
        const { headers = [] } = this.props.layer;

        return headers
            .filter(({ name }) => isValidUid(name))
            .map(({ name, column, valueType }) => ({
                key: name,
                label: column,
                type: numberValueTypes.includes(valueType)
                    ? 'number'
                    : 'string',
            }));
    }

    // Debounce needed as event is triggered multiple times for the same row
    highlightFeature = debounce(50, id => {
        const { feature, layer } = this.props;

        // If not the same feature as already highlighted
        if (!id || !feature || id !== feature.id) {
            this.props.highlightFeature(
                id
                    ? {
                          id,
                          layerId: layer.id,
                          origin: 'table',
                      }
                    : null
            );
        }
    });

    onRowMouseOver = evt => this.highlightFeature(evt.rowData.id);
    onRowMouseOut = () => this.highlightFeature();

    render() {
        const { data, sortBy, sortDirection } = this.state;
        const { width, height, layer } = this.props;

        const {
            layer: layerType,
            styleDataItem,
            serverCluster,
            classes,
            aggregationType,
            legend,
        } = layer;

        const isThematic = layerType === THEMATIC_LAYER;
        const isBoundary = layerType === BOUNDARY_LAYER;
        const isEvent = layerType === EVENT_LAYER;
        const isEarthEngine = layerType === EARTH_ENGINE_LAYER;

        return !serverCluster ? (
            <Table
                className={styles.dataTable}
                width={width}
                height={height}
                headerHeight={48}
                rowHeight={32}
                rowCount={data.length}
                rowGetter={({ index }) => data[index]}
                sort={({ sortBy, sortDirection }) =>
                    this.onSort(sortBy, sortDirection)
                }
                sortBy={sortBy}
                sortDirection={sortDirection}
                useDynamicRowHeight={false}
                hideIndexRow={false}
                onRowMouseOver={this.onRowMouseOver}
                onRowMouseOut={this.onRowMouseOut}
            >
                <Column
                    cellDataGetter={({ rowData }) => rowData.index}
                    dataKey="index"
                    label={i18n.t('Index')}
                    width={72}
                    className="right"
                />
                <Column
                    dataKey={isEvent ? 'ouname' : 'name'}
                    label={isEvent ? i18n.t('Org unit') : i18n.t('Name')}
                    width={100}
                    headerRenderer={props => (
                        <ColumnHeader type="string" {...props} />
                    )}
                />
                <Column
                    dataKey="id"
                    label={i18n.t('Id')}
                    width={100}
                    headerRenderer={props => (
                        <ColumnHeader type="string" {...props} />
                    )}
                />
                {isEvent && (
                    <Column
                        dataKey="eventdate"
                        label={i18n.t('Event time')}
                        width={100}
                        headerRenderer={props => (
                            <ColumnHeader type="date" {...props} />
                        )}
                        cellRenderer={({ cellData }) => formatTime(cellData)}
                    />
                )}
                {isEvent &&
                    this.getEventDataItems().map(({ key, label, type }) => (
                        <Column
                            key={key}
                            dataKey={key}
                            label={label}
                            width={100}
                            className={type === 'number' ? 'right' : 'left'}
                            headerRenderer={props => (
                                <ColumnHeader type={type} {...props} />
                            )}
                        />
                    ))}
                {isThematic && (
                    <Column
                        dataKey="value"
                        label={i18n.t('Value')}
                        width={72}
                        className="right"
                        headerRenderer={props => (
                            <ColumnHeader type="number" {...props} />
                        )}
                    />
                )}
                {isThematic && (
                    <Column
                        dataKey="legend"
                        label={i18n.t('Legend')}
                        width={100}
                        headerRenderer={props => (
                            <ColumnHeader type="string" {...props} />
                        )}
                    />
                )}
                {isThematic && (
                    <Column
                        dataKey="range"
                        label={i18n.t('Range')}
                        width={72}
                        headerRenderer={props => (
                            <ColumnHeader type="string" {...props} />
                        )}
                    />
                )}
                {(isThematic || isBoundary) && (
                    <Column
                        dataKey="level"
                        label={i18n.t('Level')}
                        width={72}
                        className="right"
                        headerRenderer={props => (
                            <ColumnHeader type="number" {...props} />
                        )}
                    />
                )}
                {(isThematic || isBoundary) && (
                    <Column
                        dataKey="parentName"
                        label={i18n.t('Parent')}
                        width={100}
                        headerRenderer={props => (
                            <ColumnHeader type="string" {...props} />
                        )}
                    />
                )}
                <Column
                    dataKey="type"
                    label={i18n.t('Type')}
                    width={100}
                    headerRenderer={props => (
                        <ColumnHeader type="string" {...props} />
                    )}
                />
                {isThematic ||
                    (styleDataItem && (
                        <Column
                            dataKey="color"
                            label={i18n.t('Color')}
                            width={100}
                            headerRenderer={props => (
                                <ColumnHeader type="string" {...props} />
                            )}
                            cellRenderer={ColorCell}
                        />
                    ))}

                {isEarthEngine &&
                    EarthEngineColumns({
                        classes,
                        aggregationType,
                        legend,
                        data,
                    })}
            </Table>
        ) : (
            <div className={styles.noSupport}>
                {i18n.t(
                    'Data table is not supported when events are grouped on the server.'
                )}
            </div>
        );
    }
}

export default connect(
    ({ dataTable, map, feature }) => {
        const layer = dataTable
            ? map.mapViews.filter(l => l.id === dataTable)[0]
            : null;

        return layer ? { layer, feature } : null;
    },
    {
        selectOrgUnit,
        unselectOrgUnit,
        setDataFilter,
        clearDataFilter,
        loadLayer,
        highlightFeature,
    }
)(DataTable);

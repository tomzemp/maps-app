import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import i18n from '@dhis2/d2-i18n';
import SelectField from '../../core/SelectField';
import { loadEarthEngineCollection } from '../../../actions/earthEngine';
import { getEarthEngineLayer } from '../../../util/earthEngine';
import styles from './styles/Collection.module.css';

export class CollectionSelect extends Component {
    static propTypes = {
        id: PropTypes.string.isRequired,
        label: PropTypes.string,
        errorText: PropTypes.string,
        collections: PropTypes.object.isRequired,
        filter: PropTypes.array,
        loadEarthEngineCollection: PropTypes.func.isRequired,
        onChange: PropTypes.func.isRequired,
        style: PropTypes.object,
    };

    state = {
        years: null,
        year: null,
    };

    componentDidMount() {
        const { id, collections, loadEarthEngineCollection } = this.props;

        if (id) {
            if (collections[id]) {
                this.setYears();
            } else {
                loadEarthEngineCollection(id);
            }
        }
    }

    componentDidUpdate(prevProps) {
        const { id, collections } = this.props;

        if (id && collections[id] !== prevProps.collections[id]) {
            this.setYears();
        }
    }

    setYears() {
        const { id, filter, collections } = this.props;

        const yearItems = collections[id]
            .filter(item => item.year)
            .map(item => item.year);

        if (yearItems.length) {
            // Get unique years
            const years = [...new Set(yearItems)].map(year => ({
                id: year,
                name: year.toString(),
            }));

            // Get year from saved filter or select the most recent
            const year = filter
                ? Number(filter[0].arguments[1].substring(0, 4))
                : years[0].id;

            this.setState({ years, year });
        }
    }

    render() {
        const { id, filter, label, collections, style, errorText } = this.props;

        const { years, year } = this.state;

        const items = year
            ? collections[id].filter(item => item.year === year)
            : collections[id];

        const value = filter && filter[0].arguments[1];

        return (
            <div style={style}>
                {years && (
                    <SelectField
                        label={label || i18n.t('Year')}
                        items={years}
                        value={year}
                        onChange={this.onYearChange}
                        style={styles.year}
                    />
                )}
                <SelectField
                    label={label || i18n.t('Period')}
                    loading={items ? false : true}
                    items={items}
                    value={value}
                    onChange={this.onPeriodChange}
                    style={years && styles.period}
                    errorText={!value && errorText ? errorText : null}
                />
            </div>
        );
    }

    onYearChange = year => {
        this.setState({ year: year.id });
        this.props.onChange(null, null);
    };

    onPeriodChange = period => {
        const { id: periodId, name, year } = period;
        const { id, onChange } = this.props;
        const periodName = name + (year ? ` ${year}` : '');
        const dataset = getEarthEngineLayer(id);

        const filter =
            dataset.filters ||
            (index => [
                {
                    type: 'eq',
                    arguments: ['system:index', String(index)],
                },
            ]);

        onChange(periodName, filter(periodId));
    };
}

export default connect(
    state => ({
        collections: state.earthEngine,
    }),
    { loadEarthEngineCollection }
)(CollectionSelect);

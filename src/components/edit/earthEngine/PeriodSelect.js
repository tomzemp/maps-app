import React, { useState, useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import i18n from '@dhis2/d2-i18n';
import { CircularLoader } from '@dhis2/ui';
import { FixedPeriodSelect } from '@dhis2/analytics';
import SelectField from '../../core/SelectField';
import styles from './styles/PeriodSelect.module.css';

// http://localhost:8080/api/periodTypes.json
const EarthEnginePeriodSelect = ({
    periodType,
    period,
    periods,
    onChange,
    errorText,
    className,
}) => {
    const [year, setYear] = useState();
    const byYear = periodType === 'Custom';

    const years = useMemo(
        () =>
            byYear && periods
                ? [...new Set(periods.map(p => p.year))].map(year => ({
                      id: year,
                      name: String(year),
                  }))
                : null,
        [byYear, periods]
    );

    const byYearPeriods = useMemo(
        () =>
            byYear && year && periods
                ? periods.filter(p => p.year === year)
                : null,
        [byYear, year, periods]
    );

    const onYearChange = useCallback(
        ({ id }) => {
            onChange(null);
            setYear(id);
        },
        [onChange]
    );

    const onFixedPeriodChange = useCallback(
        period => {
            if (period) {
                const { id, name, startDate, endDate } = period;
                const startTimeStamp = +new Date(startDate);
                const endTimeStamp = +new Date(endDate) + 86400000; // One day in milliseconds

                onChange({
                    id,
                    name,
                    startDate: startTimeStamp,
                    endDate: endTimeStamp,
                });
            }
        },
        [onChange]
    );

    useEffect(() => {
        if (byYear) {
            if (period) {
                setYear(period.year);
            } else if (years) {
                setYear(years[0].id);
            }
        }
    }, [byYear, period, years]);

    const items = byYear ? byYearPeriods : periods;

    // console.log('period', periodType, period);

    return items ? (
        periodType === 'Daily' ? (
            <FixedPeriodSelect
                allowedPeriodTypes={['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']}
                onChange={onFixedPeriodChange}
            />
        ) : (
            <div className={className}>
                {byYear && (
                    <SelectField
                        label={i18n.t('Year')}
                        items={years}
                        value={year}
                        onChange={onYearChange}
                        className={styles.year}
                    />
                )}
                <SelectField
                    label={i18n.t('Period')}
                    loading={!periods}
                    items={items}
                    // value={items && period && period.id}
                    onChange={onChange}
                    errorText={!period && errorText ? errorText : null}
                    className={styles.period}
                />
            </div>
        )
    ) : (
        <div className={styles.loading}>
            <CircularLoader small />
            {i18n.t('Loading periods')}
        </div>
    );
};

EarthEnginePeriodSelect.propTypes = {
    periodType: PropTypes.string.isRequired,
    period: PropTypes.object,
    periods: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    onChange: PropTypes.func.isRequired,
    errorText: PropTypes.string,
    className: PropTypes.string,
};

export default EarthEnginePeriodSelect;

import { partial, includes, filter, head } from 'lodash';

function getFirstCategoryItem(categories, collections) {
    return head(
        filter(categories, category => includes(collections, category.category.collection))
    );
}

export function transformConfigToLine(config) {
    const getItem = partial(getFirstCategoryItem, config.buckets.categories);
    const category = getItem(['attribute', 'view', 'trend']);
    const stack = getItem(['stack', 'segment']);

    const commonConfig = {
        type: config.type,
        x: category ? category.category.displayForm : '',
        y: '/metricValues',
        where: {},
        orderBy: []
    };

    if (config.colors) {
        commonConfig.colorPalette = config.colors;
    }

    if (!stack) {
        return {
            ...commonConfig,
            color: '/metricGroup',
            stacking: null
        };
    }

    return {
        ...commonConfig,
        color: stack.category.displayForm,
        stacking: config.type !== 'line' ? 'normal' : null
    };
}

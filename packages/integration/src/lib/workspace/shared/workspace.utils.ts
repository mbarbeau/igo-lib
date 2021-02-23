import {
    FeatureMotion,
    FeatureStoreSelectionStrategy,
    FeatureWorkspace,
    WfsWorkspace
} from '@igo2/geo';


export function  handleZoomAuto(workspace: FeatureWorkspace | WfsWorkspace, storageService) {
    const zoomStrategy = workspace.entityStore
        .getStrategyOfType(FeatureStoreSelectionStrategy) as FeatureStoreSelectionStrategy;
    zoomStrategy.setMotion(storageService.get('zoomAuto') as boolean ? FeatureMotion.Default : FeatureMotion.None);
}



// import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
//
// import { IgoTestModule } from '../../../test/module';
// import { IgoSharedModule } from '../../shared';
// import { OSMDataSource } from '../../datasource';
// import { MetadataService } from '../../metadata';
// import { MapService } from '../../map';
// import { FeatureService } from '../../feature';
// import { DownloadService } from '../../download';
//
// import { TileLayer } from '../shared';
// import { IgoFilterModule } from '../../filter';
// import { LayerItemComponent } from './layer-item.component';
// import { LayerLegendComponent } from '../layer-legend/layer-legend.component';
//
// describe('LayerItemComponent', () => {
//   let component: LayerItemComponent;
//   let fixture: ComponentFixture<LayerItemComponent>;
//
//   beforeEach(
//     waitForAsync(() => {
//       TestBed.configureTestingModule({
//         imports: [IgoTestModule, IgoSharedModule, IgoFilterModule],
//         declarations: [LayerItemComponent, LayerLegendComponent],
//         providers: [
//           MetadataService,
//           MapService,
//           FeatureService,
//           DownloadService
//         ]
//       }).compileComponents();
//     })
//   );
//
//   beforeEach(() => {
//     fixture = TestBed.createComponent(LayerItemComponent);
//     component = fixture.componentInstance;
//   });
//
//   it('should create', () => {
//     component.layer = new TileLayer(new OSMDataSource({ title: 'foo' }), {});
//     expect(component).toBeTruthy();
//   });
// });

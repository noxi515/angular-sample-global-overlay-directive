import { Direction, Directionality } from "@angular/cdk/bidi";
import { BooleanInput, coerceBooleanProperty } from "@angular/cdk/coercion";
import { ESCAPE, hasModifierKey } from "@angular/cdk/keycodes";
import { GlobalPositionStrategy, Overlay, OverlayConfig, OverlayRef, ScrollStrategy } from "@angular/cdk/overlay";
import { TemplatePortal } from "@angular/cdk/portal";
import {
  Directive,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef
} from "@angular/core";
import { Subscription } from "rxjs";

@Directive({
  selector: '[appGlobalOverlay]',
  exportAs: 'appGlobalOverlay'
})
export class AppGlobalOverlay implements OnDestroy, OnChanges {

  private _overlayRef!: OverlayRef;
  private readonly _templatePortal: TemplatePortal;
  private _hasBackdrop = false;
  private _backdropSubscription = Subscription.EMPTY;
  private _attachSubscription = Subscription.EMPTY;
  private _detachSubscription = Subscription.EMPTY;
  private _positionSubscription = Subscription.EMPTY;
  private _position!: GlobalPositionStrategy;
  private readonly _scrollStrategyFactory: () => ScrollStrategy;

  @Input('appGlobalOverlayPositionStrategy') positionStrategy!: GlobalPositionStrategy;

  @Input("appGlobalOverlayTop") top?: string;
  @Input("appGlobalOverlayBottom") bottom?: string;
  @Input("appGlobalOverlayLeft") left?: string;
  @Input("appGlobalOverlayRight") right?: string;
  @Input("appGlobalOverlayCenterHorizontal") centerHorizontal?: boolean;
  @Input("appGlobalOverlayCenterHorizontalOffset") centerHorizontalOffset?: string;
  @Input("appGlobalOverlayCenterVertical") centerVertical?: boolean;
  @Input("appGlobalOverlayCenterVerticalOffset") centerVerticalOffset?: string;

  /** The width of the overlay panel. */
  @Input('appGlobalOverlayWidth') width?: number | string;

  /** The height of the overlay panel. */
  @Input('appGlobalOverlayHeight') height?: number | string;

  /** The min width of the overlay panel. */
  @Input('appGlobalOverlayMinWidth') minWidth?: number | string;

  /** The min height of the overlay panel. */
  @Input('appGlobalOverlayMinHeight') minHeight?: number | string;

  /** The custom class to be set on the backdrop element. */
  @Input('appGlobalOverlayBackdropClass') backdropClass?: string;

  /** The custom class to add to the overlay pane element. */
  @Input('appGlobalOverlayPanelClass') panelClass?: string | string[];

  /** Strategy to be used when handling scroll events while the overlay is open. */
  @Input('appGlobalOverlayScrollStrategy') scrollStrategy: ScrollStrategy;

  /** Whether the overlay is open. */
  @Input('appGlobalOverlayOpen') open: boolean = false;

  /** Whether the overlay can be closed by user interaction. */
  @Input('appGlobalOverlayDisableClose') disableClose: boolean = false;

  /** Whether or not the overlay should attach a backdrop. */
  @Input('appGlobalOverlayHasBackdrop')
  get hasBackdrop() {
    return this._hasBackdrop;
  }

  set hasBackdrop(value: any) {
    this._hasBackdrop = coerceBooleanProperty(value);
  }

  /** Event emitted when the backdrop is clicked. */
  @Output() readonly backdropClick = new EventEmitter<MouseEvent>();

  /** Event emitted when the overlay has been attached. */
  @Output() readonly attach = new EventEmitter<void>();

  /** Event emitted when the overlay has been detached. */
  @Output() readonly detach = new EventEmitter<void>();

  /** Emits when there are keyboard events that are targeted at the overlay. */
  @Output() readonly overlayKeydown = new EventEmitter<KeyboardEvent>();

  /** Emits when there are mouse outside click events that are targeted at the overlay. */
  @Output() readonly overlayOutsideClick = new EventEmitter<MouseEvent>();

  constructor(
    private _overlay: Overlay,
    templateRef: TemplateRef<any>,
    viewContainerRef: ViewContainerRef,
    @Optional() private _dir: Directionality
  ) {
    this._templatePortal = new TemplatePortal(templateRef, viewContainerRef);
    this._scrollStrategyFactory = () => this._overlay.scrollStrategies.reposition();
    this.scrollStrategy = this._scrollStrategyFactory();
  }

  /** The associated overlay reference. */
  get overlayRef(): OverlayRef {
    return this._overlayRef;
  }

  /** The element's layout direction. */
  get dir(): Direction {
    return this._dir ? this._dir.value : 'ltr';
  }

  ngOnDestroy(): void {
    this._attachSubscription.unsubscribe();
    this._detachSubscription.unsubscribe();
    this._backdropSubscription.unsubscribe();
    this._positionSubscription.unsubscribe();

    if (this._overlayRef) {
      this._overlayRef.dispose();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this._position) {
      this._updatePositionStrategy(this._position);
      this._overlayRef.updateSize({
        width: this.width,
        minWidth: this.minWidth,
        height: this.height,
        minHeight: this.minHeight,
      });

      if (changes['origin'] && this.open) {
        this._position.apply();
      }
    }

    if (changes['open']) {
      this.open ? this._attachOverlay() : this._detachOverlay();
    }
  }

  /** Creates an overlay */
  private _createOverlay(): void {
    const overlayRef = this._overlayRef = this._overlay.create(this._buildConfig());
    this._attachSubscription = overlayRef.attachments().subscribe(() => this.attach.emit());
    this._detachSubscription = overlayRef.detachments().subscribe(() => this.detach.emit());
    overlayRef.keydownEvents().subscribe((event: KeyboardEvent) => {
      this.overlayKeydown.next(event);

      if (event.keyCode === ESCAPE && !this.disableClose && !hasModifierKey(event)) {
        event.preventDefault();
        this._detachOverlay();
      }
    });

    this._overlayRef.outsidePointerEvents().subscribe((event: MouseEvent) => {
      this.overlayOutsideClick.next(event);
    });
  }

  /** Builds the overlay config based on the directive's inputs */
  private _buildConfig(): OverlayConfig {
    const positionStrategy = this._position =
      this.positionStrategy || this._createPositionStrategy();
    const overlayConfig = new OverlayConfig({
      direction: this._dir,
      positionStrategy,
      scrollStrategy: this.scrollStrategy,
      hasBackdrop: this.hasBackdrop
    });

    if (this.width || this.width === 0) {
      overlayConfig.width = this.width;
    }

    if (this.height || this.height === 0) {
      overlayConfig.height = this.height;
    }

    if (this.minWidth || this.minWidth === 0) {
      overlayConfig.minWidth = this.minWidth;
    }

    if (this.minHeight || this.minHeight === 0) {
      overlayConfig.minHeight = this.minHeight;
    }

    if (this.backdropClass) {
      overlayConfig.backdropClass = this.backdropClass;
    }

    if (this.panelClass) {
      overlayConfig.panelClass = this.panelClass;
    }

    return overlayConfig;
  }

  /** Updates the state of a position strategy, based on the values of the directive inputs. */
  private _updatePositionStrategy(positionStrategy: GlobalPositionStrategy) {
    if (this.centerVertical === true) {
      positionStrategy = positionStrategy.centerVertically(this.centerVerticalOffset);
    }
    if (this.centerHorizontal === true) {
      positionStrategy = positionStrategy.centerHorizontally(this.centerHorizontalOffset);
    }

    if (this.top != null) {
      positionStrategy = positionStrategy.top(this.top);
    }

    if (this.bottom != null) {
      positionStrategy = positionStrategy.bottom(this.bottom);
    }

    if (this.left != null) {
      positionStrategy = positionStrategy.left(this.left);
    }

    if (this.right != null) {
      positionStrategy = positionStrategy.right(this.right);
    }

    return positionStrategy;
  }

  /** Returns the position strategy of the overlay to be set on the overlay config */
  private _createPositionStrategy(): GlobalPositionStrategy {
    const strategy = this._overlay.position().global();
    this._updatePositionStrategy(strategy);
    return strategy;
  }

  /** Attaches the overlay and subscribes to backdrop clicks if backdrop exists */
  private _attachOverlay(): void {
    if (!this._overlayRef) {
      this._createOverlay();
    } else {
      // Update the overlay size, in case the directive's inputs have changed
      this._overlayRef.getConfig().hasBackdrop = this.hasBackdrop;
    }

    if (!this._overlayRef.hasAttached()) {
      this._overlayRef.attach(this._templatePortal);
    }

    if (this.hasBackdrop) {
      this._backdropSubscription = this._overlayRef.backdropClick().subscribe(event => {
        this.backdropClick.emit(event);
      });
    } else {
      this._backdropSubscription.unsubscribe();
    }

    this._positionSubscription.unsubscribe();
  }

  /** Detaches the overlay and unsubscribes to backdrop clicks if backdrop exists */
  private _detachOverlay(): void {
    if (this._overlayRef) {
      this._overlayRef.detach();
    }

    this._backdropSubscription.unsubscribe();
    this._positionSubscription.unsubscribe();
  }

  static ngAcceptInputType_hasBackdrop: BooleanInput;
}

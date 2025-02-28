import { from, Observable, of } from "rxjs";
import { catchError, first, switchMap } from "rxjs/operators";

import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { TranslateService } from "@ngx-translate/core";

import {
  DialogResult,
  ExternalUrlConfirmationDialogComponent,
} from "../../components/external-url-confirmation-dialog/external-url-confirmation-dialog.component";
import { WowUpService } from "../wowup/wowup.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { USER_ACTION_OPEN_LINK } from "../../../common/constants";
import { ElectronService } from "../electron/electron.service";

@Injectable({
  providedIn: "root",
})
export class LinkService {
  public constructor(
    private _dialog: MatDialog,
    private _analyticsService: AnalyticsService,
    private _electronService: ElectronService,
    private _wowUpService: WowUpService,
    private _translateService: TranslateService
  ) {}

  public async openExternalLink(url: string): Promise<void> {
    this._analyticsService.trackAction(USER_ACTION_OPEN_LINK, {
      link: url,
    });
    await this._electronService.openExternal(url);
  }

  public confirmLinkNavigation(href: string): Observable<any> {
    return from(this._wowUpService.isTrustedDomain(href)).pipe(
      first(),
      switchMap((isTrusted) => {
        if (isTrusted) {
          return from(this.openExternalLink(href));
        } else {
          return this.showLinkNavigationDialog(href);
        }
      }),
      catchError((e) => {
        console.error(e);
        return of(undefined);
      })
    );
  }

  private showLinkNavigationDialog(href: string): Observable<any> {
    const dialogRef = this._dialog.open(ExternalUrlConfirmationDialogComponent, {
      data: {
        title: this._translateService.instant("APP.LINK_NAVIGATION.TITLE"),
        message: this._translateService.instant("APP.LINK_NAVIGATION.MESSAGE", { url: href }),
        url: href,
      },
    });

    return dialogRef.afterClosed().pipe(
      first(),
      switchMap((result: DialogResult) => {
        if (!result.success) {
          return of(undefined);
        }

        if (result.trustDomain !== "") {
          return from(this._wowUpService.trustDomain(result.trustDomain)).pipe(
            switchMap(() => from(this.openExternalLink(href)))
          );
        } else {
          return from(this.openExternalLink(href));
        }
      }),
      catchError((e) => {
        console.error("failed to open external link", e);
        return of(undefined);
      })
    );
  }
}

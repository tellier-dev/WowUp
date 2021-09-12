import { AddonForJson } from './../../../common/entities/addon';
import { WarcraftInstallationService } from './../../services/warcraft/warcraft-installation.service';
import { WowInstallation } from './../../models/wowup/wow-installation';
import { Component, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { filter } from "lodash";
import { WowUpService } from "../../services/wowup/wowup.service";
import { AddonService } from "../../services/addons/addon.service";
import { AddonProviderState } from "../../models/wowup/addon-provider-state";
import { MatSelectionListChange } from "@angular/material/list";

@Component({
  selector: "app-options-addon-section",
  templateUrl: "./options-addon-section.component.html",
  styleUrls: ["./options-addon-section.component.scss"],
})
export class OptionsAddonSectionComponent implements OnInit {
  public enabledAddonProviders = new FormControl();
  public addonProviderStates: AddonProviderState[] = [];
  public installations: WowInstallation[] = [];
  public selectedInstallation: WowInstallation;

  public constructor(
    private _addonService: AddonService, 
    private _wowupService: WowUpService,
    private _warcraftInstallationService: WarcraftInstallationService) {}

  public ngOnInit(): void {
    this.addonProviderStates = filter(this._addonService.getAddonProviderStates(), (provider) => provider.canEdit);
    this.enabledAddonProviders.setValue(this.getEnabledProviderNames());
    console.debug("addonProviderStates", this.addonProviderStates);

    this._warcraftInstallationService.wowInstallations$.subscribe((installs) => {
      console.warn("Fetched installations", installs);
      this.installations = installs;
      this.selectedInstallation = installs[0];
    });
  }

  public onProviderStateSelectionChange(event: MatSelectionListChange): void {
    event.options.forEach((option) => {
      this._wowupService.setAddonProviderState({
        providerName: option.value,
        enabled: option.selected,
        canEdit: true,
      });
      this._addonService.setProviderEnabled(option.value, option.selected);
    });
  }

  public exportAddonsAsJsonToClipboard(): void {
    let addons = this._addonService.getAllAddons(this.selectedInstallation);

    let addonsForJson: AddonForJson[] = addons.map(addon => ({id: addon.id, providerName: addon.providerName, name: addon.name}));
    var jsonExport: {installation: string, addons: AddonForJson[]} = {installation: this.selectedInstallation.label, addons: addonsForJson}
    let json = JSON.stringify(jsonExport);

    navigator.clipboard.writeText(json).then().catch(e => console.error(e));

    console.warn("Exported addons as Json to clipboard");
  }

  public async importAddonsFromJson(): Promise<boolean> {
    let json = await navigator.clipboard.readText();
    console.warn("Copied Json from clipboard", json);

    return true;
  }

  private getEnabledProviders() {
    return this.addonProviderStates.filter((state) => state.enabled);
  }

  private getEnabledProviderNames() {
    return this.getEnabledProviders().map((provider) => provider.providerName);
  }
}

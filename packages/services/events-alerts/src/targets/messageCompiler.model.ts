export class MessageTemplates {
    supportedTargets: SupportedTargets= {};
    templates: Templates= {};
}

export type SupportedTargets = {[key:string]:string};
export type Templates = {[key:string]:string};
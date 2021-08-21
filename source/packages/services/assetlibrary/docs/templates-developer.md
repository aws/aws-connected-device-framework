# ASSET LIBRARY:  Templates (Developer)

## Introduction

The following describes the implementation of the asset library templating.  Review the [Templates (User)](./templates-user.md) page for details of how to use the templating features from a users point of view.

## Schema Validation

[JSON Schema (Draft 7)](http://json-schema.org/specification.html) is being utilized to manage the validation of both the creation of the group/device templates, as well as instances of those templates.

There are 3 top-level categories of templates, each with their own JSON Schema:

- Groups (see `/src/types/definitions/group.schema.json`)
- Devices (see `/src/types/definitions/device.schema.json`)
- Components (see `/src/types/definitions/component.schema.json`)

When defining a custom type, the group/device template is validated against the JSON schema `/src/types/definitions/specializedTypeDefinition.schema.json`.

When instances of a template are created/updated (e.g creating a new `mote` device) the top-level category JSON Schema (e.g. `device`) is merged with the schema definition of the custom template (e..g `mote`) in order to provide a template specific JSON schema to validate the group/device.

When a device has been configured to allow components, an extra step is taken in the validation.  In addition to the custom template schema being merged with the device JSON Schema, the JSON Schema for each allowed component type is merged with it also, thus allowing for the validation of the creation of the device and its components in one step.

## Domain Model

The template information exposed via the API's is modelled as follows:

![TypesResource](<images/Asset%20Library%20-%20Types%20Resource.png>)

The data is stored in the database as follows:

## Data Layer

Templates have a life cycle of `draft` to `published`, along with versioning included.  

Types are defined as a vertex labelled `<<type>>`, with their corresponding versioned definitions defined as vertices labelled `<<typeDefintion>>`.  There can be only two current definitions of a type:  `draft` and `published`, each associated to the type via a `<<current_definition>>` edge.  Any old defintions are associated via an `<<expired_definition>>` edge.

The life cycle of a group/device template as far as the database is concerned is as follows:

### Step 1:  A new template has been created

![Step 1](<images/Asset%20Library%20-%20Templates%20data%20-%201.png>)

A new `<<type>>` vertex is created, and associated to the top level category via a `<<super_type>>` edge.  A new `<<type_definition>>` vertex is created, and associated to the `<<type>>` via a `<<current_definition>>` edge.  The `<<current_definition>>` edge has a status of `draft`.

### Step 2:  A template has been published

![Step 2](<images/Asset%20Library%20-%20Templates%20data%20-%202.png>)

The `status` of the `<<current_definition>>` is updated from `draft` to `published`.

### Step 3:  A template is edited

![Step 3](<images/Asset%20Library%20-%20Templates%20data%20-%203.png>)

A new `<<typeDefinition>>` vertex is created and associated to the `<<type>>` vertex via a new `<<current_definition>>` edge.  The `<<current_definition>>` edge has a `status` of `draft`.

### Step 4:  An edited template is published

![Step 4](<images/Asset%20Library%20-%20Templates%20data%20-%204.png>)

The existing `<<current_definition>>` edge that had a `status` of `published` is deleted and replaced with a new `<<expired_definition>>` edge.

The existing `<<current_definition>>` edge that has a `status` of `draft` is updated to a `status` of `published`.

### Step 5:  A template is edited again

![Step 5](<images/Asset%20Library%20-%20Templates%20data%20-%205.png>)

A new `<<typeDefinition>>` vertex is created and associated to the `<<type>>` vertex via a new `<<current_definition>>` edge.  The `<<current_definition>>` edge has a `status` of `draft`.

### Step 6 onwards...

The cycle is repeated.

### Declared relations between templates

When a template is declared with relations to other templates (e.g. a `mote` device can only be associated to a `site` group via an `located_at` relationship), this relationship is defined on the type related vertices as follows:

![Relations](<images/Asset%20Library%20-%20Templates%20data%20-%20relations.png>)

A new `<<relationship>>` edge is added between the source and target templates.  This allows for fast and efficient validation of relationships at the database level.



## Example queries

Retrieving the draft version of a template, including its defined relations:

```javascript
g.V('type___mote').as('type').
    outE('current_definition').has('status', 'draft').inV().as('definition').
    project('type','definition','relations').
        by(__.select('type').valueMap(true)).
        by(__.select('definition').valueMap(true).fold()).
        by(__.bothE('relationship').valueMap(true).fold());
  
```





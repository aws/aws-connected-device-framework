# MUST READ BEFORE RUNNING LITE MODE TESTS

As deleting a Thing Type from the AWS IoT Device Registry involves first deprecating the Thing Type, waiting for a 5 minute cool down period, then deleting, the DELETE device template function of the Asset Library (lite mode) is only able to deprecate a Thing Type.  Therefore before running tests you must wait for the 5 minute cooldown period to be over before manually deleting the deprecated Thing Type from the AWS IoT Device Registry.
